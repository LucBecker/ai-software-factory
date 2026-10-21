import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { requireSession } from "../../../src/lib/require-session";

export async function GET(request: Request) {
  const authResult = await requireSession(request);

  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const skills = await prisma.skill.findMany({
  orderBy: [
    { category: "asc" },
    { key: "asc" },
    { version: "desc" },
  ],
  include: {
    activationEvents: {
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            },
          },
        },
      },
    },
  });
      
    return NextResponse.json({ skills });
  } catch (error) {
    console.error("Erro ao consultar catálogo de skills:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar o catálogo de skills." },
      { status: 500 },
    );
  }
}