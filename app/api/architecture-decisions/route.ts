import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { requireProjectAccess } from "../../../src/lib/require-project-access";

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

    const access = await requireProjectAccess(request, projectId);

    if (!access.ok) {
    return access.response;
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

export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    if (
      typeof body.id !== "string" ||
      !body.id.trim() ||
      typeof body.projectId !== "string" ||
      !body.projectId.trim()
    ) {
      return NextResponse.json(
        { error: "Informe a decisão e o projeto." },
        { status: 400 },
      );
    }

    const decision = await prisma.architectureDecision.findFirst({
      where: {
        id: body.id,
        projectId: body.projectId,
      },
      select: { id: true },
    });

    if (!decision) {
      return NextResponse.json(
        { error: "Decisão não encontrada neste projeto." },
        { status: 404 },
      );
    }

    await prisma.architectureDecision.delete({
      where: { id: decision.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir decisão de arquitetura:", error);

    return NextResponse.json(
      { error: "Não foi possível excluir a decisão de arquitetura." },
      { status: 500 },
    );
  }
}
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

        // Aprovação explícita de uma decisão de arquitetura.
    if (body.action === "APPROVE") {
      if (
        typeof body.id !== "string" ||
        !body.id.trim() ||
        typeof body.projectId !== "string" ||
        !body.projectId.trim()
      ) {
        return NextResponse.json(
          { error: "Informe a decisão e o projeto." },
          { status: 400 },
        );
      }

      const existingDecision =
        await prisma.architectureDecision.findFirst({
          where: {
            id: body.id.trim(),
            projectId: body.projectId.trim(),
          },
        });

      if (!existingDecision) {
        return NextResponse.json(
          { error: "Decisão não encontrada neste projeto." },
          { status: 404 },
        );
      }

      if (
        existingDecision.status === "APPROVED" &&
        existingDecision.approvedAt !== null
      ) {
        return NextResponse.json({
          message: "Esta decisão já estava aprovada.",
          decision: existingDecision,
        });
      }

      const decision = await prisma.architectureDecision.update({
        where: { id: existingDecision.id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
        },
      });

      return NextResponse.json({
        message: "Decisão de arquitetura aprovada com sucesso.",
        decision,
      });
    }

    if (
      typeof body.id !== "string" ||
      !body.id.trim() ||
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

    const allowedCategories = [
      "GENERAL",
      "TECHNOLOGY",
      "DATABASE",
      "SECURITY",
      "INTEGRATION",
      "INFRASTRUCTURE",
    ];

    if (!allowedCategories.includes(body.category)) {
      return NextResponse.json(
        { error: "Selecione uma categoria válida." },
        { status: 400 },
      );
    }

    const existing = await prisma.architectureDecision.findFirst({
      where: {
        id: body.id,
        projectId: body.projectId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Decisão não encontrada neste projeto." },
        { status: 404 },
      );
    }

    const decision = await prisma.architectureDecision.update({
      where: { id: existing.id },
      data: {
        title: body.title.trim(),
        description:
          typeof body.description === "string"
            ? body.description.trim()
            : "",
        category: body.category,
        status: "PROPOSED",
        approvedAt: null,
      },
    });

    return NextResponse.json(decision);
  } catch (error) {
    console.error("Erro ao atualizar decisão de arquitetura:", error);

    return NextResponse.json(
      { error: "Não foi possível atualizar a decisão de arquitetura." },
      { status: 500 },
    );
  }
}