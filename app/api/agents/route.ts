import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { requireSession } from "../../../src/lib/require-session";

export async function GET(request: Request) {
  try {
    const authResult = await requireSession(request);

    if (!authResult.ok) {
      return authResult.response;
    }

    const agents = await prisma.agent.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        skillAssignments: {
          orderBy: {
            priority: "asc",
          },
          include: {
            skill: {
              select: {
                id: true,
                key: true,
                name: true,
                description: true,
                category: true,
                version: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Erro ao consultar agentes:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os agentes." },
      { status: 500 },
    );
  }
}