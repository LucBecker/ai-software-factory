import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../../src/lib/prisma";
import { requireProjectAccess } from "../../../src/lib/require-project-access";
import { requireSession } from "../../../src/lib/require-session";

function parseStringList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is string => typeof item === "string",
        )
      : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId")?.trim();

    if (!projectId) {
      return NextResponse.json(
        { error: "Informe o ID do projeto." },
        { status: 400 },
      );
    }

    const access = await requireProjectAccess(request, projectId);

    if (!access.ok) {
      return access.response;
    }

    const runs = await prisma.workflowRun.findMany({
      where: {
        projectId: access.project.id,
        stage: "TECHNICAL_PLANNING",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        input: true,
        output: true,
        createdAt: true,
      },
    });

    const plans = runs.map((run) => {
      let sourceRunId: string | null = null;

      try {
        const input = JSON.parse(run.input ?? "{}");
        sourceRunId = input.sourceRunId ?? null;
      } catch {
        // Mantém o plano acessível mesmo se uma entrada antiga for inválida.
      }

      return {
        id: run.id,
        status: run.status,
        sourceRunId,
        output: run.output,
        createdAt: run.createdAt,
      };
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Erro ao consultar histórico de planos:", error);

    return NextResponse.json(
      { error: "Não foi possível consultar o histórico de planos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireSession(request);

    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json();

    if (
  typeof body.analysisRunId !== "string" ||
  !body.analysisRunId.trim()
) {
  return NextResponse.json(
    { error: "Informe a análise que será planejada." },
    { status: 400 },
  );
}

const analysisRunId = body.analysisRunId.trim();

// Primeiro, encontra a análise e obtém o ID real do projeto no banco.
const analysis = await prisma.workflowRun.findFirst({
  where: {
    id: analysisRunId,
    stage: "REQUIREMENTS_ANALYSIS",
    status: "COMPLETED",
  },
  select: {
    id: true,
    projectId: true,
    output: true,
    createdAt: true,
  },
});

if (!analysis) {
  return NextResponse.json(
    { error: "A análise selecionada não foi encontrada." },
    { status: 404 },
  );
}

const projectAccess = await requireProjectAccess(
  request,
  analysis.projectId,
);

if (!projectAccess.ok) {
  return projectAccess.response;
}

// O ID é obtido do registro da análise, evitando erros de cópia.
const projectId = analysis.projectId;

const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: {
    profile: true,
    requirements: {
      orderBy: { createdAt: "asc" },
    },
    architectureDecisions: {
      where: {
        status: "APPROVED",
      },
      orderBy: {
        createdAt: "asc",
      },
    },
  },
});

if (!project) {
  return NextResponse.json(
    { error: "O projeto associado à análise não foi encontrado." },
    { status: 404 },
  );
}

  const architectureAgent = await prisma.agent.findUnique({
  where: {
    name: "Arquiteto de Software",
  },
  include: {
    skillAssignments: {
      orderBy: {
        priority: "asc",
      },
      include: {
        skill: true,
      },
    },
  },
});

  const activeSkills = (
    architectureAgent?.skillAssignments ?? []
  ).filter(
    (assignment) =>
      assignment.skill.isActive &&
      assignment.skill.reviewStatus === "APPROVED" &&
      assignment.skill.approvedAt !== null,
  );
    // Busca as revisões mais recentes primeiro.
    const reviews = await prisma.workflowRun.findMany({
      where: {
        projectId,
        stage: "REQUIREMENTS_REVIEW",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        input: true,
        createdAt: true,
      },
    });

    // Encontra a revisão mais recente vinculada à análise selecionada.
    const latestReview = reviews.find((review) => {
      try {
        const reviewInput = JSON.parse(review.input ?? "{}");
        return reviewInput.sourceRunId === analysis.id;
      } catch {
        return false;
      }
    });

    if (!latestReview || latestReview.status !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            "Planejamento bloqueado. A análise selecionada precisa estar aprovada antes de avançar.",
        },
        { status: 409 },
      );
    }

    if (project.requirements.length === 0) {
      return NextResponse.json(
        {
          error:
            "O projeto precisa ter pelo menos um requisito cadastrado.",
        },
        { status: 400 },
      );
    }

    // Carrega as instruções do agente definido no arquivo Markdown.
    const agentInstructions = await readFile(
      path.join(
        process.cwd(),
        "agents",
        "planejador-tecnico.md",
      ),
      "utf8",
    );

    const priorityLabel: Record<string, string> = {
      HIGH: "Alta",
      MEDIUM: "Média",
      LOW: "Baixa",
    };

    const requirementTasks = project.requirements
      .map((requirement, index) =>
        [
          `### Tarefa ${String(index + 1).padStart(2, "0")} — ${requirement.title}`,
          `- Requisito relacionado: ${requirement.title}`,
          `- Prioridade: ${priorityLabel[requirement.priority] ?? requirement.priority}`,
          `- Descrição de referência: ${requirement.description.trim() || "Não informada."}`,
          "- Dependências: validar os critérios de aceitação e as regras de negócio.",
          "- Resultado esperado: funcionalidade implementada conforme o requisito aprovado.",
          "- Critério de conclusão: critérios de aceitação definidos e testes funcionais aprovados.",
        ].join("\n"),
      )
      .join("\n\n");

    const architectureSection =
      project.architectureDecisions.length > 0
        ? project.architectureDecisions
            .map(
              (decision) =>
                `- ${decision.title}: ${decision.description.trim() || "Sem justificativa registrada."} (categoria: ${decision.category})`,
            )
            .join("\n")
        : "Nenhuma decisão de arquitetura cadastrada. As decisões técnicas necessárias deverão ser identificadas antes da implementação.";


    const profile = project.profile;

const skillsSection =
  activeSkills.length > 0
    ? activeSkills
        .map(({ priority, isRequired, skill }) =>
          [
            `### ${skill.name} — versão ${skill.version}`,
            `- Prioridade: ${priority}`,
            `- Obrigatória para o agente: ${isRequired ? "Sim" : "Não"}`,
            `- Critérios de ativação: ${skill.activationCriteria.trim() || "Não informados."}`,
            "",
            "#### Instruções da skill",
            skill.instructions,
          ].join("\n"),
        )
        .join("\n\n")
    : "Nenhuma skill associada ao Arquiteto de Software está simultaneamente aprovada e ativa. Não presumir competências provenientes de skills indisponíveis.";

const softwareTypeLabels: Record<string, string> = {
  UNDECIDED: "Não definido",
  WEB_APP: "Aplicação web",
  API: "API ou backend",
  SAAS: "SaaS",
  MOBILE_APP: "Aplicativo mobile",
  DESKTOP_APP: "Aplicação desktop",
  LEGACY_MODERNIZATION: "Modernização de sistema existente",
  OTHER: "Outro",
};

const targetPlatformLabels: Record<string, string> = {
  UNDECIDED: "Não definida",
  WEB: "Web",
  MOBILE: "Mobile",
  WEB_AND_MOBILE: "Web e mobile",
  DESKTOP: "Desktop",
  BACKEND: "Backend",
  OTHER: "Outra",
};

const databaseLabels: Record<string, string> = {
  UNDECIDED: "Não definido",
  POSTGRESQL: "PostgreSQL",
  MYSQL: "MySQL",
  SQLITE: "SQLite",
  SQL_SERVER: "SQL Server",
  MONGODB: "MongoDB",
  OTHER: "Outro",
};

const deploymentLabels: Record<string, string> = {
  UNDECIDED: "Não definido",
  LOCAL: "Local",
  AWS: "AWS",
  AZURE: "Microsoft Azure",
  GCP: "Google Cloud",
  ON_PREMISES: "Infraestrutura própria",
  OTHER: "Outro",
};

    const profileSection = profile
      ? [
          `- Tipo de software: ${softwareTypeLabels[profile.softwareType] ?? profile.softwareType}`,
          `- Plataforma-alvo: ${targetPlatformLabels[profile.targetPlatform] ?? profile.targetPlatform}`,
          `- Linguagens preferidas: ${parseStringList(profile.preferredLanguages).join(", ") || "Não informadas."}`,
          `- Frameworks preferidos: ${parseStringList(profile.preferredFrameworks).join(", ") || "Não informados."}`,
          `- Banco de dados: ${databaseLabels[profile.databasePreference] ?? profile.databasePreference}`,
          `- Implantação: ${deploymentLabels[profile.deploymentTarget] ?? profile.deploymentTarget}`,
          `- Integrações: ${parseStringList(profile.integrations).join(", ") || "Não informadas."}`,
          `- Requisitos de segurança: ${profile.securityRequirements.trim() || "Não informados."}`,
          `- Requisitos de desempenho: ${profile.performanceRequirements.trim() || "Não informados."}`,
          `- Restrições de orçamento: ${profile.budgetConstraints.trim() || "Não informadas."}`,
          `- Outras restrições: ${profile.otherConstraints.trim() || "Não informadas."}`,
          `- Contexto adicional: ${profile.additionalContext.trim() || "Não informado."}`,
        ].join("\n")
      : "Perfil técnico não cadastrado. Não presumir tecnologias ou decisões ainda não definidas.";        

    const output = [
      `# Plano técnico — ${project.name}`,
      "",
      "> MODO DEMONSTRATIVO: este plano foi montado por regras fixas, sem chamada a um modelo de IA.",
      "",
      `Análise de origem aprovada: ${analysis.id}`,
      "",
      "## 1. Objetivo e escopo",
      project.description.trim() ||
        `Implementar as funcionalidades definidas nos requisitos do projeto ${project.name}.`,
      "",
      "## 2. Pré-requisitos",
      "- Especificação funcional revisada e aprovada.",
      "- Requisitos cadastrados no projeto.",
      "- Revisão humana deste plano antes da implementação.",
      "",
      "## 3. Perfil técnico do projeto",
      profileSection,
      "",
      "## 4. Skills arquiteturais elegíveis",
      skillsSection,
      "",
      "## 5. Decisões de arquitetura aprovadas",
      architectureSection,
      "",
      "## 6. Plano de tarefas",
      requirementTasks,
      "",
      "## 7. Estratégia de testes",
      "- Testes funcionais dos critérios de aceitação de cada requisito.",
      "- Testes de validação e tratamento de erros.",
      "- Testes de integração dos componentes envolvidos.",
      "- Testes de regressão antes de concluir a entrega.",
      "- Revisão de segurança compatível com as funcionalidades implementadas.",
      "",
      "## 8. Riscos e dependências",
      "- Requisitos com descrições incompletas podem exigir esclarecimentos.",
      "- Decisões de arquitetura pendentes devem ser resolvidas antes das tarefas dependentes.",
      "- A sequência definitiva de implementação depende da revisão técnica das tarefas.",
      "",
      "## 9. Decisões pendentes",
      "- Confirmar critérios de aceitação detalhados.",
      "- Validar tecnologias e integrações ainda não especificadas.",
      "- Confirmar dependências entre as tarefas antes de iniciar o desenvolvimento.",
      "",
      "## 10. Ordem recomendada de execução",
      "1. Revisar o plano e esclarecer as pendências.",
      "2. Confirmar as decisões de arquitetura necessárias.",
      "3. Implementar as funcionalidades por requisito e dependência.",
      "4. Executar os testes e corrigir os problemas encontrados.",
      "5. Realizar auditoria antes de liberar a entrega.",
      "",
      "## 11. Aprovação do plano",
      "Plano demonstrativo pendente de revisão humana. Nenhum código foi gerado ou executado nesta etapa.",
  ].join("\n");
    const startedAt = new Date();
    const finishedAt = new Date();

    const run = await prisma.workflowRun.create({
      data: {
        projectId: project.id,
        stage: "TECHNICAL_PLANNING",
        status: "COMPLETED",
        input: JSON.stringify({
          agent: "Planejador Técnico",
          agentFile: "agents/planejador-tecnico.md",
          agentInstructions,
          sourceRunId: analysis.id,
          sourceAnalysis: analysis.output,
          requirements: project.requirements,
          architectureDecisions: project.architectureDecisions,
          projectProfile: project.profile,
          activeSkills: activeSkills.map(({ priority, isRequired, skill }) => ({
            id: skill.id,
            key: skill.key,
            name: skill.name,
            version: skill.version,
            priority,
            isRequired,
            activationCriteria: skill.activationCriteria,
            instructions: skill.instructions,
          })),
        }),
        output,
        startedAt,
        finishedAt,
      },
    });

    return NextResponse.json(
      {
        runId: run.id,
        status: run.status,
        mode: "DEMO",
        output: run.output,
        createdAt: run.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro no Planejador Técnico:", error);

    return NextResponse.json(
      {
        error: "Não foi possível executar o planejamento técnico.",
      },
      { status: 500 },
    );
  }
}