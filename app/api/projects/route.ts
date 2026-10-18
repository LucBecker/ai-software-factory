
import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { requireSession } from "../../../src/lib/require-session";


export async function GET(request: Request) {
  const authResult = await requireSession(request);

    if (!authResult.ok) {
      return authResult.response;
    }
  try {
    const projects = await prisma.project.findMany({
      where: {
        userId: authResult.session.user.id,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Erro ao listar projetos:", error);

    return NextResponse.json(
      { error: "Não foi possível listar os projetos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireSession(request);

    if (!authResult.ok) {
      return authResult.response;
    }
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("name" in body) ||
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.trim().length > 120
    ) {
      return NextResponse.json(
        { error: "Informe um nome válido de até 120 caracteres." },
        { status: 400 },
      );
    }

    const description =
      "description" in body &&
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    if (description.length > 2000) {
      return NextResponse.json(
        { error: "A descrição deve ter até 2000 caracteres." },
        { status: 400 },
      );
    }

    const project = await prisma.project.create({
      data: {
        name: body.name.trim(),
        description,
        userId: authResult.session.user.id,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar projeto:", error);

    return NextResponse.json(
      { error: "Não foi possível criar o projeto." },
      { status: 500 },
    );
  }
}
