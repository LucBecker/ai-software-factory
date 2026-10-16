import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../../src/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      typeof body.projectId !== "string" ||
      !body.projectId.trim()
    ) {
      return NextResponse.json(
        { error: "Informe o projeto que será analisado." },
        { status: 400 },
      );
    }

    // Carrega a definição do agente criada na pasta agents.
    const agentInstructions = await readFile(
      path.join(process.cwd(), "agents", "analista-requisitos.md"),
      "utf8",
    );

    const project = await prisma.project.findUnique({
      where: { id: body.projectId.trim() },
      include: {
        requirements: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Projeto não encontrado." },
        { status: 404 },
      );
    }

    if (project.requirements.length === 0) {
      return NextResponse.json(
        {
          error:
            "Cadastre pelo menos um requisito antes de executar o agente.",
        },
        { status: 400 },
      );
    }

    const priorityLabel: Record<string, string> = {
      HIGH: "Alta",
      MEDIUM: "Média",
      LOW: "Baixa",
    };

    const requirementsSection = project.requirements
      .map((requirement, index) =>
        [
          `### ${index + 1}. ${requirement.title}`,
          `- Prioridade: ${priorityLabel[requirement.priority] ?? requirement.priority}`,
          `- Descrição: ${requirement.description.trim() || "Não informada."}`,
          "- Critério de aceitação sugerido: validar por meio de um teste funcional se o comportamento descrito foi atendido.",
        ].join("\n"),
      )
      .join("\n\n");

    const output = [
      `# Especificação funcional — ${project.name}`,
      "",
      "> MODO DEMONSTRATIVO: este resultado foi montado por regras fixas, sem chamada a um modelo de IA.",
      "",
      "## 1. Resumo executivo",
      project.description.trim() ||
        `Organizar e implementar as funcionalidades definidas para ${project.name}.`,
      "",
      "## 2. Requisitos funcionais",
      requirementsSection,
      "",
      "## 3. Histórias de usuário a detalhar",
      ...project.requirements.map(
        (requirement) =>
          `- Como usuário, quero ${requirement.title.toLowerCase()}, para atender à necessidade descrita no requisito.`,
      ),
      "",
      "## 4. Pontos para validação",
      "- Confirmar as regras de negócio com as partes interessadas.",
      "- Detalhar cenários de sucesso, erro e exceção.",
      "- Validar os critérios de aceitação antes da implementação.",
      "- Revisar a especificação antes de iniciar a arquitetura.",
      "",
      "## 5. Próximas etapas",
      "- Revisar e aprovar a especificação funcional.",
      "- Completar critérios de aceitação.",
      "- Registrar decisões de arquitetura.",
      "- Preparar o plano de desenvolvimento e testes.",
      "",
      "## 6. Status",
      "Especificação demonstrativa pendente de revisão humana.",
    ].join("\n");

    const run = await prisma.workflowRun.create({
      data: {
        projectId: project.id,
        stage: "REQUIREMENTS_ANALYSIS",
        status: "COMPLETED",
        input: JSON.stringify({
          agent: "Analista de Requisitos",
          agentFile: "agents/analista-requisitos.md",
          agentInstructions,
          projectName: project.name,
          requirements: project.requirements.map((requirement) => ({
            title: requirement.title,
            description: requirement.description,
            priority: requirement.priority,
          })),
        }),
        output,
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        runId: run.id,
        status: run.status,
        output: run.output,
        createdAt: run.createdAt,
        mode: "DEMO",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro no agente Analista de Requisitos:", error);

    return NextResponse.json(
      { error: "Não foi possível executar a análise demonstrativa." },
      { status: 500 },
    );
  }
}
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Informe o ID do projeto." },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Projeto não encontrado." },
        { status: 404 },
      );
    }

    const runs = await prisma.workflowRun.findMany({
      where: {
        projectId,
        stage: "REQUIREMENTS_ANALYSIS",
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        output: true,
        createdAt: true,
        startedAt: true,
        finishedAt: true,
      },
    });

    return NextResponse.json(runs);
  } catch (error) {
    console.error("Erro ao consultar histórico de análises:", error);

    return NextResponse.json(
      { error: "Não foi possível consultar o histórico de análises." },
      { status: 500 },
    );
  }
}