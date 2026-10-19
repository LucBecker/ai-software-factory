import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { requireSession } from "./require-session";

export async function requireAdmin(request: Request) {
  const authResult = await requireSession(request);

  if (!authResult.ok) {
    return authResult;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: authResult.session.user.id,
    },
    select: {
      accessLevel: true,
    },
  });

  if (!user || user.accessLevel !== "ADMIN") {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Acesso restrito a administradores." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    session: authResult.session,
  };
}