import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { requireAdmin } from "../../../../src/lib/require-admin";

const validDecisions = ["APPROVED", "CHANGES_REQUESTED"] as const;

type ReviewDecision = (typeof validDecisions)[number];

export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin(request);

    if (!authResult.ok) {
      return authResult.response;
    }

    const skillId = new URL(request.url).searchParams.get("skillId");

    const reviews = await prisma.skillReview.findMany({
      where: skillId ? { skillId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        skill: {
          select: {
            id: true,
            key: true,
            name: true,
            version: true,
            reviewStatus: true,
            isActive: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Erro ao consultar revisões de skills:", error);

    return NextResponse.json(
      { error: "Não foi possível consultar o histórico de revisões." },
      { status: 500 },
    );
  }
}

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
        { error: "Os dados da revisão são inválidos." },
        { status: 400 },
      );
    }

    const data = body as Record<string, unknown>;
    const skillId =
      typeof data.skillId === "string" ? data.skillId.trim() : "";
    const decision = data.decision;
    const comment =
      typeof data.comment === "string" ? data.comment.trim() : "";

    if (!skillId || skillId.length > 100) {
      return NextResponse.json(
        { error: "Informe uma skill válida para revisar." },
        { status: 400 },
      );
    }

    if (
      typeof decision !== "string" ||
      !validDecisions.includes(decision as ReviewDecision)
    ) {
      return NextResponse.json(
        { error: "A decisão deve ser APPROVED ou CHANGES_REQUESTED." },
        { status: 400 },
      );
    }

    if (comment.length > 5000) {
      return NextResponse.json(
        { error: "O comentário deve ter no máximo 5000 caracteres." },
        { status: 400 },
      );
    }

    if (decision === "CHANGES_REQUESTED" && !comment) {
      return NextResponse.json(
        { error: "Informe os ajustes necessários para solicitar alterações." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const skill = await tx.skill.findUnique({
        where: { id: skillId },
        select: { id: true },
      });

      if (!skill) {
        return null;
      }

      const approved = decision === "APPROVED";

      const updatedSkill = await tx.skill.update({
        where: { id: skillId },
        data: {
          reviewStatus: decision,
          approvedAt: approved ? new Date() : null,
          approvedById: approved ? authResult.session.user.id : null,
          // Aprovar não ativa automaticamente a skill.
          isActive: false,
        },
      });

      const review = await tx.skillReview.create({
        data: {
          skillId,
          reviewerId: authResult.session.user.id,
          decision,
          comment,
        },
      });

      return { skill: updatedSkill, review };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Skill não encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message:
        decision === "APPROVED"
          ? "Skill aprovada. Ela permanece inativa até uma ativação separada."
          : "Ajustes solicitados. A skill permanece inativa.",
      skill: result.skill,
      review: result.review,
    });
  } catch (error) {
    console.error("Erro ao registrar revisão de skill:", error);

    return NextResponse.json(
      { error: "Não foi possível registrar a revisão da skill." },
      { status: 500 },
    );
  }
}