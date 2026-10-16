import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";

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

    const decisions = await prisma.architectureDecision.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(decisions);
  } catch (error) {
    console.error("Erro ao listar decisões de arquitetura:", error);

    return NextResponse.json(
      { error: "Não foi possível listar as decisões de arquitetura." },
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
      typeof body.title !== "string" ||
      !body.title.trim()
    ) {
      return NextResponse.json(
        { error: "Informe o projeto e o título da decisão." },
        { status: 400 },
      );
    }

    if (
      body.title.trim().length > 120 ||
      (typeof body.description === "string" &&
        body.description.length > 2000)
    ) {
      return NextResponse.json(
        { error: "O título ou a descrição ultrapassa o limite permitido." },
        { status: 400 },
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Projeto não encontrado." },
        { status: 404 },
      );
    }

    const allowedCategories = [
      "GENERAL",
      "TECHNOLOGY",
      "DATABASE",
      "SECURITY",
      "INTEGRATION",
      "INFRASTRUCTURE",
    ];

    const category = allowedCategories.includes(body.category)
      ? body.category
      : "GENERAL";

    const decision = await prisma.architectureDecision.create({
      data: {
        title: body.title.trim(),
        description:
          typeof body.description === "string"
            ? body.description.trim()
            : "",
        category,
        projectId: body.projectId,
      },
    });

    return NextResponse.json(decision, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar decisão de arquitetura:", error);

    return NextResponse.json(
      { error: "Não foi possível criar a decisão de arquitetura." },
      { status: 500 },
    );
  }
}