import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";

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
  const availableProjects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  return NextResponse.json(
    {
      error: "Projeto não encontrado.",
      receivedProjectId: projectId,
      availableProjects,
    },
    { status: 404 },
  );
}

    const runs = await prisma.workflowRun.findMany({
      where: {
        projectId,
        stage: "REQUIREMENTS_REVIEW",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        input: true,
        output: true,
        createdAt: true,
      },
    });

    const reviews = runs.map((run) => {
      let sourceRunId: string | null = null;
      let comment = "";

      try {
        const input = JSON.parse(run.input || "{}");
        sourceRunId = input.sourceRunId ?? null;
        comment = input.comment ?? "";
      } catch {
        // Mantém os dados básicos mesmo se uma entrada antiga for inválida.
      }

      return {
        id: run.id,
        status: run.status,
        sourceRunId,
        comment,
        output: run.output,
        createdAt: run.createdAt,
      };
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Erro ao consultar histórico de revisões:", error);

    return NextResponse.json(
      { error: "Não foi possível consultar o histórico de revisões." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      typeof body.projectId !== "string" ||
      !body.projectId.trim() ||
      typeof body.runId !== "string" ||
      !body.runId.trim() ||
      !["APPROVED", "CHANGES_REQUESTED"].includes(body.decision)
    ) {
      return NextResponse.json(
        {
          error: "Informe o projeto, a execução e uma decisão válida.",
        },
        { status: 400 },
      );
    }

    if (
      body.comment !== undefined &&
      (typeof body.comment !== "string" ||
        body.comment.length > 2000)
    ) {
      return NextResponse.json(
        { error: "O comentário deve ter no máximo 2000 caracteres." },
        { status: 400 },
      );
    }

    const sourceRun = await prisma.workflowRun.findFirst({
      where: {
        id: body.runId,
        projectId: body.projectId,
        stage: "REQUIREMENTS_ANALYSIS",
        status: "COMPLETED",
      },
      select: { id: true },
    });

    if (!sourceRun) {
      return NextResponse.json(
        {
          error: "Execução de análise não encontrada neste projeto.",
        },
        { status: 404 },
      );
    }

    const now = new Date();
    const comment =
      typeof body.comment === "string" ? body.comment.trim() : "";

    const review = await prisma.workflowRun.create({
      data: {
        projectId: body.projectId,
        stage: "REQUIREMENTS_REVIEW",
        status: body.decision,
        input: JSON.stringify({
          sourceRunId: sourceRun.id,
          decision: body.decision,
          comment,
        }),
        output:
          comment ||
          (body.decision === "APPROVED"
            ? "Especificação aprovada pelo usuário."
            : "A especificação precisa de ajustes."),
        startedAt: now,
        finishedAt: now,
      },
    });

    return NextResponse.json(
      {
        id: review.id,
        status: review.status,
        output: review.output,
        createdAt: review.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao registrar revisão:", error);

    return NextResponse.json(
      { error: "Não foi possível registrar a revisão." },
      { status: 500 },
    );
  }
}