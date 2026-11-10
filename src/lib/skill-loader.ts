
import { prisma } from "./prisma";

/**
 * Seleção demonstrativa de skills.
 * Não executa agentes, scripts ou código importado.
 */

const CONCEPT_GROUPS = [
  {
    label: "arquitetura e design",
    terms: [
      "arquitetura", "arquitetural", "architecture",
      "architectural", "design", "designing",
    ],
  },
  {
    label: "módulos",
    terms: [
      "modulo", "modulos", "module", "modules",
      "modular", "deep", "deepening",
    ],
  },
  {
    label: "interfaces e contratos",
    terms: [
      "interface", "interfaces", "contrato",
      "contratos", "contract", "contracts", "api",
    ],
  },
  {
    label: "pontos de integração",
    terms: [
      "seam", "seams", "fronteira", "fronteiras",
      "integracao", "integracoes", "boundary",
    ],
  },
  {
    label: "dependências e adapters",
    terms: [
      "dependencia", "dependencias", "dependency",
      "dependencies", "adapter", "adapters",
    ],
  },
  {
    label: "refatoração",
    terms: [
      "refatoracao", "refatorar", "refactor",
      "refactoring", "restructure",
    ],
  },
  {
    label: "testabilidade",
    terms: [
      "testabilidade", "testavel", "testes", "teste",
      "testing", "testable", "tests",
    ],
  },
  {
    label: "código e codebase",
    terms: [
      "codigo", "code", "codebase", "software",
    ],
  },
  {
    label: "localidade das mudanças",
    terms: [
      "localidade", "locality", "mudanca",
      "mudancas", "change", "changes",
    ],
  },
  {
    label: "abstração e camadas",
    terms: [
      "abstracao", "abstraction", "camada",
      "camadas", "layer", "layers",
    ],
  },
];

const MAX_SKILLS = 5;
const MAX_REFERENCE_FILE_BYTES = 100_000;
const MAX_TOTAL_REFERENCE_BYTES = 300_000;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(value: string): Set<string> {
  return new Set(normalize(value).match(/[a-z0-9]+/g) ?? []);
}

function shouldLoadReference(
  task: string,
  resourcePath: string,
): boolean {
  const normalizedTask = normalize(task);
  const normalizedPath = normalize(resourcePath);

  const deepeningTerms = [
    "modulo",
    "modulos",
    "module",
    "modules",
    "deep module",
    "deep modules",
    "interface",
    "interfaces",
    "seam",
    "seams",
    "testabilidade",
    "testavel",
    "teste",
    "testes",
    "testing",
    "testability",
    "refatoracao",
    "refatorar",
    "refactoring",
    "dependencia",
    "dependencias",
    "dependency",
    "dependencies",
    "adapter",
    "adapters",
  ];

  const designTwiceTerms = [
    "comparar",
    "comparacao",
    "comparacoes",
    "alternativa",
    "alternativas",
    "opcao",
    "opcoes",
    "tradeoff",
    "trade-offs",
    "trade-off",
    "compare",
    "comparison",
    "alternatives",
    "alternative designs",
    "design alternatives",
  ];

  if (
    normalizedPath === "deepening.md" ||
    normalizedPath.endsWith("/deepening.md")
  ) {
    return deepeningTerms.some((term) =>
      normalizedTask.includes(normalize(term)),
    );
  }

  if (
    normalizedPath === "design-it-twice.md" ||
    normalizedPath.endsWith("/design-it-twice.md")
  ) {
    return designTwiceTerms.some((term) =>
      normalizedTask.includes(normalize(term)),
    );
  }

  // Referências ainda não configuradas não são carregadas automaticamente.
  return false;
}

function calculateRelevance(task: string, skillText: string) {
  const taskTokens = tokenize(task);
  const skillTokens = tokenize(skillText);

  const matches = CONCEPT_GROUPS.filter((group) => {
    const taskMatches = group.terms.some((term) =>
      taskTokens.has(normalize(term)),
    );

    const skillMatches = group.terms.some((term) =>
      skillTokens.has(normalize(term)),
    );

    return taskMatches && skillMatches;
  });

  return {
    score: matches.length,
    reasons: matches.map((group) => group.label),
  };
}

export type SkillLoaderOptions = {
  maxSkills?: number;
  minRelevanceScore?: number;
};

export async function loadRelevantSkills(
  agentName: string,
  task: string,
  options: SkillLoaderOptions = {},
) {
  if (!agentName.trim()) {
    throw new Error("Informe o nome do agente.");
  }

  if (!task.trim()) {
    throw new Error("Informe a tarefa que será analisada.");
  }

  const maxSkills = Math.min(
    Math.max(options.maxSkills ?? MAX_SKILLS, 1),
    20,
  );

  const minRelevanceScore = Math.max(
    options.minRelevanceScore ?? 1,
    1,
  );

  const agent = await prisma.agent.findUnique({
    where: {
      name: agentName.trim(),
    },
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
      skillAssignments: {
        orderBy: [
          { priority: "asc" },
          { createdAt: "asc" },
        ],
        select: {
          priority: true,
          isRequired: true,
          skill: {
            select: {
              id: true,
              key: true,
              name: true,
              description: true,
              category: true,
              instructions: true,
              rulesJson: true,
              activationCriteria: true,
              version: true,
              isActive: true,
              reviewStatus: true,
              approvedAt: true,
              sourceType: true,
              sourceRepository: true,
              sourceCommit: true,
              rawContent: true,
              metadataJson: true,
            },
          },
        },
      },
    },
  });

  if (!agent) {
    throw new Error(`Agente "${agentName}" não encontrado.`);
  }

  const eligibleCandidates = [];
  const unavailableSkills = [];

  for (const assignment of agent.skillAssignments) {
    const skill = assignment.skill;

    const relevance = calculateRelevance(
      task,
      [
        skill.name,
        skill.description,
        skill.activationCriteria,
      ].join("\n"),
    );

    const relevant =
      assignment.isRequired ||
      relevance.score >= minRelevanceScore;

    if (!relevant) {
      continue;
    }

    if (
      skill.reviewStatus !== "APPROVED" ||
      !skill.approvedAt
    ) {
      unavailableSkills.push({
        name: skill.name,
        version: skill.version,
        reason: "PENDING_REVIEW",
        relevance,
      });

      continue;
    }

    if (!skill.isActive) {
      unavailableSkills.push({
        name: skill.name,
        version: skill.version,
        reason: "INACTIVE",
        relevance,
      });

      continue;
    }

    eligibleCandidates.push({
      ...assignment,
      relevance,
      content: skill.rawContent ?? skill.instructions,
      skill,
    });
  }

  // A prioridade menor representa precedência maior.
  eligibleCandidates.sort(
    (a, b) =>
      a.priority - b.priority ||
      b.relevance.score - a.relevance.score,
  );

  const required = eligibleCandidates.filter(
    (candidate) => candidate.isRequired,
  );

  const optional = eligibleCandidates
    .filter((candidate) => !candidate.isRequired)
    .slice(0, maxSkills);

  const selected = [...required, ...optional];

  const skillIds = selected.map(
    (candidate) => candidate.skill.id,
  );

  const resources = skillIds.length
    ? await prisma.skillResource.findMany({
        where: {
          skillId: {
            in: skillIds,
          },
        },
        orderBy: {
          path: "asc",
        },
        select: {
          id: true,
          skillId: true,
          path: true,
          content: true,
          contentType: true,
          sizeBytes: true,
        },
      })
    : [];

  let totalReferenceBytes = 0;
  const warnings: string[] = [];

  const selectedSkills = selected.map((candidate) => {
    const referenceFiles = [];

    const skillResources = resources.filter(
      (resource) =>
        resource.skillId === candidate.skill.id,
    );

    for (const resource of skillResources) {
      const isMarkdown =
        resource.contentType === "text/markdown" &&
        resource.path.toLowerCase().endsWith(".md");

      const isMainFile =
        resource.path.toLowerCase() === "skill.md";

      const hasUnsafePath =
        resource.path.includes("..") ||
        resource.path.startsWith("/") ||
        resource.path.startsWith("\\");

      if (
        !isMarkdown ||
        isMainFile ||
        hasUnsafePath ||
        !shouldLoadReference(task, resource.path)
        ) {
        continue;
        }

      const resourceBytes = new TextEncoder().encode(
        resource.content,
      ).length;

      if (resourceBytes > MAX_REFERENCE_FILE_BYTES) {
        warnings.push(
          `Referência ${resource.path} excede o limite individual e não foi carregada.`,
        );
        continue;
      }

      if (
        totalReferenceBytes + resourceBytes >
        MAX_TOTAL_REFERENCE_BYTES
      ) {
        warnings.push(
          "O limite total de referências foi atingido.",
        );
        break;
      }

      totalReferenceBytes += resourceBytes;

      referenceFiles.push({
        path: resource.path,
        content: resource.content,
        contentType: resource.contentType,
      });
    }

    return {
      id: candidate.skill.id,
      key: candidate.skill.key,
      name: candidate.skill.name,
      version: candidate.skill.version,
      category: candidate.skill.category,
      priority: candidate.priority,
      isRequired: candidate.isRequired,
      relevance: candidate.relevance,
      content: candidate.content,
      referenceFiles,
      source: {
        type: candidate.skill.sourceType,
        repository: candidate.skill.sourceRepository,
        commit: candidate.skill.sourceCommit,
      },
    };
  });

  if (!agent.isActive) {
    warnings.push(
      "O agente está inativo. O serviço preparou o contexto, mas isso não autoriza sua execução.",
    );
  }

  const unavailableRequired = unavailableSkills.filter(
    (skill) => skill.reason !== undefined,
  );

  if (unavailableRequired.length > 0) {
    warnings.push(
      "Existem skills associadas indisponíveis por revisão ou ativação. Elas não foram carregadas.",
    );
  }

  if (selectedSkills.length === 0) {
    warnings.push(
      "Nenhuma skill ativa e aprovada foi considerada relevante para esta tarefa.",
    );
  }

  return {
    mode: "DEMO_RULE_BASED_SELECTION",
    agent: {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      isActive: agent.isActive,
    },
    task,
    selectedSkills,
    unavailableSkills,
    warnings,
    summary: {
      assigned: agent.skillAssignments.length,
      selected: selectedSkills.length,
      unavailable: unavailableSkills.length,
      referenceFiles: selectedSkills.reduce(
        (total, skill) =>
          total + skill.referenceFiles.length,
        0,
      ),
    },
  };
}
