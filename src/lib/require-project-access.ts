import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { requireSession } from "./require-session";

export async function requireProjectAccess(
  request: Request,
  projectId: string | null,
) {
  const authResult = await requireSession(request);

  if (!authResult.ok) {
    return authResult;
  }

  if (!projectId?.trim()) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Informe o ID do projeto." },
        { status: 400 },
      ),
    };
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: authResult.session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!project) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Projeto não encontrado ou acesso não autorizado." },
        { status: 404 },
      ),
    };
  }

  return {
    ok: true as const,
    session: authResult.session,
    project,
  };
}