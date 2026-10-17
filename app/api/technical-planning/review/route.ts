import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";

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
        projectId: project.id,
        stage: "TECHNICAL_PLANNING_REVIEW",
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

    const reviews = runs.map((run) => {
      let sourceRunId: string | null = null;
      let comment = "";

      try {
        const input = JSON.parse(run.input ?? "{}");

        sourceRunId = input.sourceRunId ?? null;
        comment = input.comment ?? "";
      } catch {
        // Preserva a consulta mesmo se uma entrada antiga for inválida.
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
    console.error(
      "Erro ao consultar histórico de revisões do plano:",
      error,
    );

    return NextResponse.json(
      { error: "Não foi possível consultar o histórico de revisões do plano." },
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
      typeof body.planRunId !== "string" ||
      !body.planRunId.trim() ||
      !["APPROVED", "CHANGES_REQUESTED"].includes(body.decision)
    ) {
      return NextResponse.json(
        {
          error:
            "Informe o projeto, o plano e a decisão da revisão.",
        },
        { status: 400 },
      );
    }

    const projectId = body.projectId.trim();
    const planRunId = body.planRunId.trim();
    const decision = body.decision as
      | "APPROVED"
      | "CHANGES_REQUESTED";
    const comment =
      typeof body.comment === "string" ? body.comment.trim() : "";

    if (decision === "CHANGES_REQUESTED" && !comment) {
      return NextResponse.json(
        {
          error:
            "Informe os ajustes necessários antes de enviar a revisão.",
        },
        { status: 400 },
      );
    }

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
      },
    });

    if (!plan) {
      return NextResponse.json(
        {
          error:
            "Plano técnico não encontrado neste projeto.",
        },
        { status: 404 },
      );
    }

    const now = new Date();

    const review = await prisma.workflowRun.create({
      data: {
        projectId: plan.projectId,
        stage: "TECHNICAL_PLANNING_REVIEW",
        status: decision,
        input: JSON.stringify({
          sourceRunId: plan.id,
          comment,
          decision,
        }),
        output:
          comment ||
          (decision === "APPROVED"
            ? "Plano técnico aprovado."
            : "Ajustes solicitados."),
        startedAt: now,
        finishedAt: now,
      },
    });

    return NextResponse.json(
      {
        id: review.id,
        status: review.status,
        sourceRunId: plan.id,
        comment,
        createdAt: review.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao registrar revisão do plano técnico:", error);

    return NextResponse.json(
      {
        error:
          "Não foi possível registrar a revisão do plano técnico.",
      },
      { status: 500 },
    );
  }
}