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

    const requirements = await prisma.requirement.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requirements);
  } catch (error) {
    console.error("Erro ao listar requisitos:", error);

    return NextResponse.json(
      { error: "Não foi possível listar os requisitos." },
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
        { error: "Informe o projeto e o título do requisito." },
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

    const allowedPriorities = ["LOW", "MEDIUM", "HIGH"];

    const priority = allowedPriorities.includes(body.priority)
      ? body.priority
      : "MEDIUM";

    const requirement = await prisma.requirement.create({
      data: {
        title: body.title.trim(),
        description:
          typeof body.description === "string"
            ? body.description.trim()
            : "",
        priority,
        projectId: body.projectId,
      },
    });

    return NextResponse.json(requirement, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar requisito:", error);

    return NextResponse.json(
      { error: "Não foi possível criar o requisito." },
      { status: 500 },
    );
  }
}