import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";

function readTaskField(block: string, label: string): string {
  const expression = new RegExp(
    `^\\s*[-*]\\s*${label}\\s*:\\s*(.+)$`,
    "im",
  );

  return block.match(expression)?.[1]?.trim() ?? "";
}

function parseTechnicalTasks(output: string) {
  const headingPattern =
    /^#{2,4}\s*Tarefa\s*(\d+)?\s*[-–—:]\s*(.+)$/gim;

  const matches = Array.from(output.matchAll(headingPattern));

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? output.length;
    const block = output.slice(start, end);

    const number = (match[1] ?? String(index + 1)).padStart(3, "0");
    const title = match[2].trim();
    const dependencyText = readTaskField(block, "Dependências");

    return {
      taskKey: `TASK-${number}`,
      title,
      description:
        readTaskField(block, "Descrição de referência") ||
        "Tarefa extraída do plano técnico aprovado.",
      requirement: readTaskField(block, "Requisito relacionado"),
      dependencies: JSON.stringify(
        dependencyText ? [dependencyText] : [],
      ),
      expectedResult: readTaskField(block, "Resultado esperado"),
      acceptanceCriteria: readTaskField(
        block,
        "Critério de conclusão",
      ),
    };
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId")?.trim();
    const planRunId = searchParams.get("planRunId")?.trim();

    if (!projectId) {
      return NextResponse.json(
        { error: "Informe o ID do projeto." },
        { status: 400 },
      );
    }

    const tasks = await prisma.developmentTask.findMany({
      where: {
        projectId,
        ...(planRunId ? { sourcePlanRunId: planRunId } : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Erro ao consultar tarefas:", error);

    return NextResponse.json(
      { error: "Não foi possível consultar as tarefas." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (
      typeof body.taskId !== "string" ||
      !body.taskId.trim() ||
      !["TODO", "IN_PROGRESS", "DONE"].includes(body.status)
    ) {
      return NextResponse.json(
        {
          error:
            "Informe uma tarefa válida e um status permitido.",
        },
        { status: 400 },
      );
    }

    const taskId = body.taskId.trim();
    const status = body.status as string;

    const existingTask = await prisma.developmentTask.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: "Tarefa não encontrada." },
        { status: 404 },
      );
    }

    const updatedTask = await prisma.developmentTask.update({
      where: { id: taskId },
      data: { status },
    });

    return NextResponse.json({
      message: "Status da tarefa atualizado com sucesso.",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Erro ao atualizar status da tarefa:", error);

    return NextResponse.json(
      { error: "Não foi possível atualizar o status da tarefa." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      !body ||
      typeof body.projectId !== "string" ||
      !body.projectId.trim() ||
      typeof body.planRunId !== "string" ||
      !body.planRunId.trim()
    ) {
      return NextResponse.json(
        { error: "Informe o projeto e o plano técnico." },
        { status: 400 },
      );
    }

    const projectId = body.projectId.trim();
    const planRunId = body.planRunId.trim();

    const plan = await prisma.workflowRun.findFirst({
      where: {
        id: planRunId,
        projectId,
        stage: "TECHNICAL_PLANNING",
        status: "COMPLETED",
      },
      select: {
        id: true,
        projectId: true,
        output: true,
      },
    });

    if (!plan || !plan.output) {
      return NextResponse.json(
        { error: "Plano técnico concluído não encontrado neste projeto." },
        { status: 404 },
      );
    }

    // Consulta as revisões mais recentes para este plano específico.
    const reviews = await prisma.workflowRun.findMany({
      where: {
        projectId,
        stage: "TECHNICAL_PLANNING_REVIEW",
      },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        input: true,
      },
    });

    const latestReview = reviews.find((review) => {
      try {
        const input = JSON.parse(review.input ?? "{}");
        return input.sourceRunId === plan.id;
      } catch {
        return false;
      }
    });

    if (!latestReview || latestReview.status !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            "O plano precisa ter uma aprovação válida antes de gerar tarefas.",
        },
        { status: 409 },
      );
    }

    // Se já existem tarefas para esse plano, retorna as existentes.
    const existingTasks = await prisma.developmentTask.findMany({
      where: { sourcePlanRunId: plan.id },
      orderBy: { createdAt: "asc" },
    });

    if (existingTasks.length > 0) {
      return NextResponse.json(
        {
          message: "As tarefas deste plano já foram geradas.",
          created: false,
          tasks: existingTasks,
        },
        { status: 200 },
      );
    }

    const parsedTasks = parseTechnicalTasks(plan.output);

    if (parsedTasks.length === 0) {
      return NextResponse.json(
        {
          error:
            "Não foram encontradas tarefas no plano aprovado. Verifique a seção Plano de tarefas.",
        },
        { status: 422 },
      );
    }

    const tasks = await prisma.$transaction(
      parsedTasks.map((task) =>
        prisma.developmentTask.create({
          data: {
            projectId: plan.projectId,
            sourcePlanRunId: plan.id,
            ...task,
            status: "TODO",
          },
        }),
      ),
    );

    return NextResponse.json(
      {
        message: "Tarefas de desenvolvimento geradas com sucesso.",
        created: true,
        sourcePlanRunId: plan.id,
        tasks,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao gerar tarefas de desenvolvimento:", error);

    return NextResponse.json(
      { error: "Não foi possível gerar as tarefas de desenvolvimento." },
      { status: 500 },
    );
  }
}