import { NextResponse } from "next/server";
import { prisma } from "../../../../src/lib/prisma";
import { requireAdmin } from "../../../../src/lib/require-admin";

export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin(request);

    if (!authResult.ok) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get("skillId")?.trim();
    const resourcePath = searchParams.get("path")?.trim();

    if (!skillId || !resourcePath) {
      return NextResponse.json(
        { error: "Informe o ID da skill e o caminho do recurso." },
        { status: 400 },
      );
    }

    if (skillId.length > 100 || resourcePath.length > 500) {
      return NextResponse.json(
        { error: "Os parâmetros informados são inválidos." },
        { status: 400 },
      );
    }

    const resource = await prisma.skillResource.findFirst({
      where: {
        skillId,
        path: resourcePath,
      },
      select: {
        id: true,
        path: true,
        content: true,
        contentHash: true,
        contentType: true,
        sizeBytes: true,
        skill: {
          select: {
            id: true,
            name: true,
            version: true,
            sourceRepository: true,
            sourceCommit: true,
            sourceLicense: true,
            reviewStatus: true,
            isActive: true,
          },
        },
      },
    });

    if (!resource) {
      return NextResponse.json(
        { error: "Recurso não encontrado para esta skill." },
        { status: 404 },
      );
    }

    return NextResponse.json({ resource });
  } catch (error) {
    console.error("Erro ao consultar recurso de skill:", error);

    return NextResponse.json(
      { error: "Não foi possível consultar o conteúdo do recurso." },
      { status: 500 },
    );
  }
}