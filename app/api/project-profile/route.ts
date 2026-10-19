import { NextResponse } from "next/server";
import { prisma } from "../../../src/lib/prisma";
import { requireSession } from "../../../src/lib/require-session";
import { requireProjectAccess } from "../../../src/lib/require-project-access";

function readText(
  value: unknown,
  fallback = "",
  maxLength = 5000
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim().slice(0, maxLength);
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((item) => item.slice(0, 120));
}

function parseStringList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is string => typeof item === "string"
        )
      : [];
  } catch {
    return [];
  }
}

function presentProfile(
  profile: NonNullable<
    Awaited<ReturnType<typeof prisma.projectProfile.findUnique>>
  >
) {
  return {
    ...profile,
    preferredLanguages: parseStringList(profile.preferredLanguages),
    preferredFrameworks: parseStringList(profile.preferredFrameworks),
    integrations: parseStringList(profile.integrations),
  };
}

// Consultar o perfil de um projeto
export async function GET(request: Request) {
  try {
    const projectId = new URL(request.url).searchParams.get("projectId");

    const access = await requireProjectAccess(request, projectId);

    if (!access.ok) {
      return access.response;
    }

    const profile = await prisma.projectProfile.findUnique({
      where: { projectId: access.project.id },
    });

    return NextResponse.json({
      profile: profile ? presentProfile(profile) : null,
    });
  } catch (error) {
    console.error("Erro ao consultar perfil do projeto:", error);

    return NextResponse.json(
      { error: "Não foi possível consultar o perfil do projeto." },
      { status: 500 }
    );
  }
}

// Criar ou atualizar o perfil de um projeto
export async function PUT(request: Request) {
  try {
    const authResult = await requireSession(request);

    if (!authResult.ok) {
      return authResult.response;
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "O corpo da requisição deve conter JSON válido." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Os dados do perfil são inválidos." },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;
    const projectId = readText(data.projectId, "", 100);

    if (!projectId) {
      return NextResponse.json(
        { error: "O projeto é obrigatório." },
        { status: 400 }
      );
    }

    const access = await requireProjectAccess(request, projectId);

    if (!access.ok) {
      return access.response;
    }

    const profileData = {
      softwareType: readText(data.softwareType, "UNDECIDED", 100),
      targetPlatform: readText(data.targetPlatform, "UNDECIDED", 100),

      preferredLanguages: JSON.stringify(
        readStringList(data.preferredLanguages)
      ),
      preferredFrameworks: JSON.stringify(
        readStringList(data.preferredFrameworks)
      ),

      databasePreference: readText(
        data.databasePreference,
        "UNDECIDED",
        100
      ),
      deploymentTarget: readText(
        data.deploymentTarget,
        "UNDECIDED",
        100
      ),

      integrations: JSON.stringify(readStringList(data.integrations)),

      securityRequirements: readText(data.securityRequirements),
      performanceRequirements: readText(data.performanceRequirements),
      budgetConstraints: readText(data.budgetConstraints),
      otherConstraints: readText(data.otherConstraints),
      additionalContext: readText(data.additionalContext),
    };

    const profile = await prisma.projectProfile.upsert({
      where: {
        projectId: access.project.id,
      },
      create: {
        projectId: access.project.id,
        ...profileData,
      },
      update: profileData,
    });

    return NextResponse.json({
      message: "Perfil do projeto salvo com sucesso.",
      profile: presentProfile(profile),
    });
  } catch (error) {
    console.error("Erro ao salvar perfil do projeto:", error);

    return NextResponse.json(
      { error: "Não foi possível salvar o perfil do projeto." },
      { status: 500 }
    );
  }
}