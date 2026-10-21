require("dotenv/config");

const { createHash } = require("node:crypto");
const { parse } = require("yaml");
const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

const OWNER = "mattpocock";
const REPO = "skills";
const REPOSITORY_URL = `https://github.com/${OWNER}/${REPO}`;
const SKILL_DIRECTORY = "skills/engineering/codebase-design";

const MAX_FILE_BYTES = 200_000;
const MAX_TOTAL_BYTES = 1_000_000;

function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

async function fetchText(url, label) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ai-software-factory-skill-importer/0.1",
      Accept: "application/vnd.github+json",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao baixar ${label}: HTTP ${response.status}`,
    );
  }

  const content = await response.text();
  const size = Buffer.byteLength(content, "utf8");

  if (size > MAX_FILE_BYTES) {
    throw new Error(
      `O arquivo ${label} excede o limite de ${MAX_FILE_BYTES} bytes.`,
    );
  }

  return content;
}

function parseSkillDocument(rawContent) {
  const match = rawContent.match(
    /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
  );

  if (!match) {
    throw new Error("O SKILL.md não possui frontmatter YAML válido.");
  }

  const metadata = parse(match[1]);

  if (
    !metadata ||
    typeof metadata.name !== "string" ||
    typeof metadata.description !== "string"
  ) {
    throw new Error(
      "O frontmatter precisa conter os campos name e description.",
    );
  }

  const instructions = rawContent.slice(match[0].length).trimStart();

  if (!instructions.trim()) {
    throw new Error("O SKILL.md não contém instruções.");
  }

  return {
    metadata,
    instructions,
  };
}

function getStringMetadata(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

async function main() {
  // Identifica um commit específico para não importar arquivos
  // de versões diferentes do repositório na mesma operação.
  const commitInfo = await fetchText(
    `https://api.github.com/repos/${OWNER}/${REPO}/commits/main`,
    "commit do repositório",
  );

  const commit = JSON.parse(commitInfo);

  if (!/^[a-f0-9]{40}$/i.test(commit.sha ?? "")) {
    throw new Error("O GitHub não retornou um SHA de commit válido.");
  }

  const sourceCommit = commit.sha;

  const filesToImport = [
    {
      repositoryPath: `${SKILL_DIRECTORY}/SKILL.md`,
      resourcePath: "SKILL.md",
      contentType: "text/markdown",
    },
    {
      repositoryPath: `${SKILL_DIRECTORY}/DEEPENING.md`,
      resourcePath: "DEEPENING.md",
      contentType: "text/markdown",
    },
    {
      repositoryPath: `${SKILL_DIRECTORY}/DESIGN-IT-TWICE.md`,
      resourcePath: "DESIGN-IT-TWICE.md",
      contentType: "text/markdown",
    },
    {
      repositoryPath: `${SKILL_DIRECTORY}/agents/openai.yaml`,
      resourcePath: "agents/openai.yaml",
      contentType: "application/yaml",
    },
    {
      repositoryPath: "LICENSE",
      resourcePath: "__repository__/LICENSE",
      contentType: "text/plain",
    },
  ];

  const importedFiles = [];

  for (const file of filesToImport) {
    const url =
      `https://raw.githubusercontent.com/${OWNER}/${REPO}/` +
      `${sourceCommit}/${file.repositoryPath}`;

    const content = await fetchText(url, file.repositoryPath);

    importedFiles.push({
      ...file,
      content,
      contentHash: sha256(content),
      sizeBytes: Buffer.byteLength(content, "utf8"),
    });
  }

  const totalBytes = importedFiles.reduce(
    (sum, file) => sum + file.sizeBytes,
    0,
  );

  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new Error("O conjunto de arquivos excede o limite de importação.");
  }

  const mainFile = importedFiles.find(
    (file) => file.resourcePath === "SKILL.md",
  );

  const licenseFile = importedFiles.find(
    (file) => file.resourcePath === "__repository__/LICENSE",
  );

  // Para este primeiro teste, aceitamos apenas a licença que verificamos.
  if (!licenseFile.content.startsWith("MIT License")) {
    throw new Error(
      "A licença não corresponde a MIT. A importação foi interrompida para revisão.",
    );
  }

  const { metadata, instructions } = parseSkillDocument(mainFile.content);

  const key = "mattpocock-codebase-design";

  // O hash considera todos os arquivos importados, não apenas SKILL.md.
  const bundleManifest = importedFiles
    .map((file) => ({
      path: file.repositoryPath,
      hash: file.contentHash,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const bundleHash = sha256(JSON.stringify(bundleManifest));

  const versions = await prisma.skill.findMany({
    where: { key },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      contentHash: true,
      sourceCommit: true,
      reviewStatus: true,
      isActive: true,
    },
  });

  const identicalVersion = versions.find(
    (skill) => skill.contentHash === bundleHash,
  );

  if (identicalVersion) {
    console.log("Este conteúdo já foi importado. Nenhuma duplicata criada:");
    console.log(identicalVersion);
    return;
  }

  const version = (versions[0]?.version ?? 0) + 1;

  const titleMatch = instructions.match(/^#\s+(.+)$/m);
  const displayName = titleMatch
    ? titleMatch[1].trim()
    : metadata.name;

  const allowedTools =
    metadata["allowed-tools"] ?? metadata.allowedTools;

  const result = await prisma.$transaction(async (tx) => {
    const skill = await tx.skill.create({
      data: {
        key,
        version,
        name: displayName,
        description: metadata.description,
        category: "ENGINEERING",
        instructions,
        activationCriteria: metadata.description,
        rulesJson: "[]",

        sourceType: "GITHUB",
        sourceRepository: REPOSITORY_URL,
        sourcePath: `${SKILL_DIRECTORY}/SKILL.md`,
        sourceRef: "main",
        sourceCommit,
        sourceLicense: "MIT",
        contentHash: bundleHash,
        rawContent: mainFile.content,
        compatibility: getStringMetadata(metadata.compatibility),
        allowedTools: getStringMetadata(allowedTools),

        metadataJson: JSON.stringify(
          {
            frontmatter: metadata,
            importedAt: new Date().toISOString(),
            manifest: bundleManifest,
            licenseRepositoryPath: "LICENSE",
          },
          null,
          2,
        ),

        // Importação nunca aprova nem ativa automaticamente.
        isActive: false,
        reviewStatus: "PENDING",

        resources: {
          create: importedFiles.map((file) => ({
            path: file.resourcePath,
            content: file.content,
            contentHash: file.contentHash,
            contentType: file.contentType,
            sizeBytes: file.sizeBytes,
          })),
        },
      },
      select: {
        id: true,
        key: true,
        name: true,
        version: true,
        sourceRepository: true,
        sourcePath: true,
        sourceCommit: true,
        sourceLicense: true,
        reviewStatus: true,
        isActive: true,
      },
    });

    return skill;
  });

  console.log("Skill importada com sucesso:");
  console.log(result);
  console.log(`Arquivos armazenados: ${importedFiles.length}`);
  console.log(`Tamanho total: ${totalBytes} bytes`);
  console.log(`SHA-256 do conjunto: ${bundleHash}`);
}

main()
  .catch((error) => {
    console.error("Erro ao importar a skill:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });