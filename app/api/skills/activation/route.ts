import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { requireAdmin } from "../../../../src/lib/require-admin";

export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin(request);

    if (!authResult.ok) {
      return authResult.response;
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "O corpo da requisição deve conter JSON válido." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Os dados da ativação são inválidos." },
        { status: 400 },
      );
    }

    const data = body as Record<string, unknown>;

    const skillId =
      typeof data.skillId === "string" ? data.skillId.trim() : "";

    const action = data.action;

    const comment =
      typeof data.comment === "string" ? data.comment.trim() : "";

    if (!skillId || skillId.length > 100) {
      return NextResponse.json(
        { error: "Informe uma skill válida." },
        { status: 400 },
      );
    }

    if (action !== "ACTIVATE" && action !== "DEACTIVATE") {
      return NextResponse.json(
        { error: "A ação deve ser ACTIVATE ou DEACTIVATE." },
        { status: 400 },
      );
    }

    if (comment.length > 5000) {
      return NextResponse.json(
        { error: "O comentário deve ter no máximo 5000 caracteres." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const skill = await tx.skill.findUnique({
        where: { id: skillId },
        select: {
          id: true,
          name: true,
          version: true,
          isActive: true,
          reviewStatus: true,
          approvedAt: true,
        },
      });

      if (!skill) {
        return { kind: "NOT_FOUND" as const };
      }

      if (
        action === "ACTIVATE" &&
        (skill.reviewStatus !== "APPROVED" || !skill.approvedAt)
      ) {
        return {
          kind: "NOT_APPROVED" as const,
          reviewStatus: skill.reviewStatus,
        };
      }

      const desiredState = action === "ACTIVATE";

      if (skill.isActive === desiredState) {
        return {
          kind: "UNCHANGED" as const,
          skill,
        };
      }

      const updatedSkill = await tx.skill.update({
        where: { id: skillId },
        data: {
          isActive: desiredState,
        },
      });

      const event = await tx.skillActivationEvent.create({
        data: {
          skillId,
          actorId: authResult.session.user.id,
          action:
            action === "ACTIVATE" ? "ACTIVATED" : "DEACTIVATED",
          comment,
        },
      });

      return {
        kind: "UPDATED" as const,
        skill: updatedSkill,
        event,
      };
    });

    if (result.kind === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Skill não encontrada." },
        { status: 404 },
      );
    }

    if (result.kind === "NOT_APPROVED") {
      return NextResponse.json(
        {
          error: "A skill precisa estar aprovada antes da ativação.",
          reviewStatus: result.reviewStatus,
        },
        { status: 409 },
      );
    }

    if (result.kind === "UNCHANGED") {
      return NextResponse.json({
        message: result.skill.isActive
          ? "A skill já estava ativa."
          : "A skill já estava inativa.",
        skill: result.skill,
        changed: false,
      });
    }

    return NextResponse.json({
      message:
        action === "ACTIVATE"
          ? "Skill ativada com sucesso. Nenhum agente foi executado."
          : "Skill desativada com sucesso.",
      skill: result.skill,
      event: result.event,
      changed: true,
    });
  } catch (error) {
    console.error("Erro ao alterar ativação da skill:", error);

    return NextResponse.json(
      { error: "Não foi possível alterar o status da skill." },
      { status: 500 },
    );
  }
}