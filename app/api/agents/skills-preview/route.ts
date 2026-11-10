import { NextResponse } from "next/server";
import { requireProjectAccess } from "../../../../src/lib/require-project-access";
import { loadRelevantSkills } from "../../../../src/lib/skill-loader";

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "O corpo da requisição deve conter JSON válido." },
        { status: 400 },
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Os dados informados são inválidos." },
        { status: 400 },
      );
    }

    const data = body as Record<string, unknown>;

    const projectId =
      typeof data.projectId === "string"
        ? data.projectId.trim()
        : "";

    const agentName =
      typeof data.agentName === "string"
        ? data.agentName.trim()
        : "";

    const task =
      typeof data.task === "string"
        ? data.task.trim()
        : "";

    if (!projectId || !agentName || !task) {
      return NextResponse.json(
        {
          error:
            "Informe o projeto, o agente e a tarefa para análise.",
        },
        { status: 400 },
      );
    }

    if (
      projectId.length > 100 ||
      agentName.length > 120 ||
      task.length > 5000
    ) {
      return NextResponse.json(
        { error: "Um ou mais campos excedem o limite permitido." },
        { status: 400 },
      );
    }

    const access = await requireProjectAccess(
      request,
      projectId,
    );

    if (!access.ok) {
      return access.response;
    }

    const preview = await loadRelevantSkills(
      agentName,
      task,
      {
        maxSkills: 5,
        minRelevanceScore: 1,
      },
    );

    return NextResponse.json({
      projectId: access.project.id,
      preview,
    });
  } catch (error) {
    console.error("Erro ao pré-visualizar skills:", error);

    return NextResponse.json(
      { error: "Não foi possível preparar o contexto das skills." },
      { status: 500 },
    );
  }
}