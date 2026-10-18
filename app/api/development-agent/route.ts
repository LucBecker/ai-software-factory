import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";

type RequestBody = {
  projectId?: unknown;
  taskId?: unknown;
};

function getReviewSourceRunId(input: string | null): string | null {
  try {
    const parsed = JSON.parse(input ?? "{}");
    return typeof parsed.sourceRunId === "string"
      ? parsed.sourceRunId
      : null;
  } catch {
    return null;
  }
}

function parseDependencies(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");

    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
  } catch {
    // Trata também valores antigos que não estejam em JSON.
  }

  return value.trim() ? [value] : [];
}

export async function POST(request: Request) {
  try {
    let body: RequestBody;

    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        { error: "O corpo da requisição não contém JSON válido." },
        { status: 400 },
      );
    }

    if (
      typeof body.projectId !== "string" ||
      !body.projectId.trim() ||
      typeof body.taskId !== "string" ||
      !body.taskId.trim()
    ) {
      return NextResponse.json(
        { error: "Informe o projeto e a tarefa de desenvolvimento." },
        { status: 400 },
      );
    }

    const projectId = body.projectId.trim();
    const taskId = body.taskId.trim();

    // 1. Confirma que a tarefa pertence ao projeto informado.
    const task = await prisma.developmentTask.findFirst({
      where: {
        id: taskId,
        projectId,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Tarefa não encontrada neste projeto." },
        { status: 404 },
      );
    }

    // 2. Confirma que o plano de origem existe e foi concluído.
    const plan = await prisma.workflowRun.findFirst({
      where: {
        id: task.sourcePlanRunId,
        projectId,
        stage: "TECHNICAL_PLANNING",
        status: "COMPLETED",
      },
      select: {
        id: true,
        output: true,
      },
    });

    if (!plan || !plan.output) {
      return NextResponse.json(
        {
          error:
            "O plano técnico de origem não foi encontrado ou não foi concluído.",
        },
        { status: 409 },
      );
    }

    // 3. Busca a revisão mais recente associada a este plano.
    const reviews = await prisma.workflowRun.findMany({
      where: {
        projectId,
        stage: "TECHNICAL_PLANNING_REVIEW",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        input: true,
        createdAt: true,
      },
    });

    const latestReview = reviews.find(
      (review) =>
        getReviewSourceRunId(review.input) === plan.id,
    );

    if (!latestReview || latestReview.status !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            "O plano de origem precisa ter uma aprovação válida antes de preparar a implementação.",
        },
        { status: 409 },
      );
    }

    // 4. Analisa os dados disponíveis sem modificar arquivos-fonte.
    const dependencies = parseDependencies(task.dependencies);

    const architectureDecisions =
  await prisma.architectureDecision.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: {
      title: true,
      description: true,
      category: true,
      status: true,
      approvedAt: true,
      createdAt: true,
    },
  });

// Somente decisões formalmente aprovadas entram no contexto técnico.
const approvedArchitectureDecisions =
  architectureDecisions.filter(
    (decision) =>
      decision.status === "APPROVED" &&
      decision.approvedAt !== null,
  );

// Decisões propostas ou sem registro de aprovação continuam pendentes.
const proposedArchitectureDecisions =
  architectureDecisions.filter(
    (decision) =>
      decision.status !== "APPROVED" ||
      decision.approvedAt === null,
  );

const architectureContext = approvedArchitectureDecisions
  .map(
    (decision) =>
      `${decision.title} ${decision.description} ${decision.category}`,
  )
  .join("\n")
  .toLocaleLowerCase("pt-BR");

const isAuthenticationTask =
  /login|autentica|senha|e-mail|email/i.test(
    `${task.title} ${task.requirement} ${task.description}`,
  );

const hasImplementationTarget =
  /next\.?js|app router|repositório|aplicação atual/i.test(
    architectureContext,
  );

const hasUserModelDecision =
  /modelo de usuários|modelo de usuário|persistência de usuários|user model/i.test(
    architectureContext,
  );

const hasPasswordSecurityDecision =
  /senha|password|hash|bcrypt|argon2|scrypt/i.test(
    architectureContext,
  );

const hasSessionDecision =
  /sessão|session|cookie|jwt|token/i.test(
    architectureContext,
  );

const hasAuthenticationTestsDecision =
  /credenciais inválidas|testes de autenticação|testes de segurança|tentativas de login|rate.?limit|bloqueio de conta/i.test(
    architectureContext,
  );

const blockers: string[] = [];

if (!task.title.trim()) {
  blockers.push("O título da tarefa não foi informado.");
}

if (!task.requirement.trim()) {
  blockers.push("O requisito relacionado não foi informado.");
}

if (!task.expectedResult.trim()) {
  blockers.push("O resultado esperado não foi definido.");
}

if (!task.acceptanceCriteria.trim()) {
  blockers.push(
    "Os critérios de conclusão precisam ser detalhados.",
  );
}

if (!hasImplementationTarget) {
  blockers.push(
    "Confirmar formalmente o repositório e a aplicação-alvo.",
  );
}

if (isAuthenticationTask) {
  if (!hasUserModelDecision) {
    blockers.push(
      "Definir o modelo de usuários e sua persistência.",
    );
  }

  if (!hasPasswordSecurityDecision) {
    blockers.push(
      "Definir a estratégia de armazenamento e proteção das senhas.",
    );
  }

  if (!hasSessionDecision) {
    blockers.push(
      "Definir a estratégia de gerenciamento de sessões.",
    );
  }

  if (!hasAuthenticationTestsDecision) {
    blockers.push(
      "Definir os testes de autenticação e os comportamentos de segurança.",
    );
  }
}

    const proposalStatus =
      blockers.length > 0 ? "BLOCKED" : "READY_FOR_REVIEW";

    const proposal = [
  `# Proposta do Agente de Desenvolvimento — ${task.taskKey}`,
  "",
  `**Status da proposta:** ${proposalStatus}`,
  "",
  "## Decisões de arquitetura aprovadas",
"",
...(approvedArchitectureDecisions.length > 0
  ? approvedArchitectureDecisions.map(
      (decision) =>
        `- [${decision.category}] ${decision.title}: ${
          decision.description || "Sem descrição."
        } — aprovada em ${
          decision.approvedAt?.toISOString() ??
          "data não registrada"
        }`,
    )
  : [
      "- Nenhuma decisão de arquitetura formalmente aprovada.",
    ]),
"",
"## Decisões ainda pendentes",
"",
...(proposedArchitectureDecisions.length > 0
  ? proposedArchitectureDecisions.map(
      (decision) =>
        `- [${decision.status}] [${decision.category}] ${
          decision.title
        }: ${decision.description || "Sem descrição."}`,
    )
  : [
      "- Nenhuma decisão pendente encontrada.",
    ]),
"",
"### Verificações de contexto",
  `- Aplicação-alvo: ${
    hasImplementationTarget
      ? "Encontrada em decisão cadastrada."
      : "Pendente."
  }`,
  ...(isAuthenticationTask
    ? [
        `- Modelo de usuários: ${
          hasUserModelDecision ? "Encontrado." : "Pendente."
        }`,
        `- Proteção de senhas: ${
          hasPasswordSecurityDecision ? "Encontrada." : "Pendente."
        }`,
        `- Gerenciamento de sessões: ${
          hasSessionDecision ? "Encontrado." : "Pendente."
        }`,
        `- Testes de autenticação: ${
          hasAuthenticationTestsDecision
            ? "Encontrados."
            : "Pendentes."
        }`,
      ]
    : []),
  "",
  "## 1. Resumo da tarefa",
      "",
      task.title,
      "",
      task.description || "Descrição adicional não informada.",
      "",
      "## 2. Validação de origem",
      "",
      `- Projeto: ${projectId}`,
      `- Tarefa: ${task.id}`,
      `- Plano técnico: ${plan.id}`,
      `- Revisão aprovada: ${latestReview.id}`,
      "- Aprovação do plano: confirmada no banco de dados.",
      "",
      "## 3. Requisito e dependências",
      "",
      `- Requisito: ${task.requirement || "Não informado."}`,
      `- Dependências: ${
        dependencies.length > 0
          ? dependencies.join("; ")
          : "Nenhuma dependência registrada."
      }`,
      `- Resultado esperado: ${
        task.expectedResult || "Não informado."
      }`,
      `- Critérios de conclusão: ${
        task.acceptanceCriteria || "Não informados."
      }`,
      "",
      "## 4. Proposta técnica preliminar",
      "",
      "Antes de definir alterações concretas, confirmar a estrutura do repositório-alvo e as decisões de arquitetura.",
      "",
      ...(isAuthenticationTask
        ? [
            "Pontos técnicos a avaliar:",
            "- Modelo de usuários e persistência de dados.",
            "- Hash seguro de senhas; nunca armazenar senhas em texto puro.",
            "- Gerenciamento de sessão e proteção de credenciais.",
            "- Validação de entradas e tratamento seguro de erros.",
            "- Proteção contra tentativas repetidas de autenticação.",
            "- Testes para login válido, credenciais inválidas e cenários de segurança.",
          ]
        : [
            "Pontos técnicos a avaliar:",
            "- Estrutura atual da aplicação e arquivos afetados.",
            "- Dependências e decisões de arquitetura.",
            "- Estratégia de testes e tratamento de erros.",
          ]),
      "",
      "## 5. Bloqueios e informações pendentes",
      "",
      ...(blockers.length > 0
        ? blockers.map((item) => `- ${item}`)
        : ["- Nenhum bloqueio identificado nesta análise inicial."]),
      "",
      "## 6. Controle de alterações",
      "",
      "Nenhum arquivo-fonte foi criado ou modificado por esta análise.",
      "A implementação depende da resolução dos bloqueios e da revisão humana da proposta.",
      "",
      "## 7. Status final",
      "",
      proposalStatus === "BLOCKED"
        ? "Proposta bloqueada até que as informações essenciais sejam esclarecidas."
        : "Proposta pronta para revisão humana.",
    ].join("\n");

    // 5. Registra a proposta no histórico de execuções do projeto.
    const run = await prisma.workflowRun.create({
      data: {
        projectId,
        stage: "DEVELOPMENT_AGENT_ANALYSIS",
        status: "COMPLETED",
        input: JSON.stringify({
          taskId: task.id,
          sourcePlanRunId: plan.id,
          sourceReviewRunId: latestReview.id,
          proposalStatus,
        }),
        output: proposal,
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        message: "Análise do Agente de Desenvolvimento registrada.",
        runId: run.id,
        status: proposalStatus,
        taskId: task.id,
        sourcePlanRunId: plan.id,
        output: proposal,
        createdAt: run.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Erro no Agente de Desenvolvimento:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível preparar a proposta de implementação.",
      },
      { status: 500 },
    );
  }
}