import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../src/lib/require-admin";

export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin(request);

    if (!authResult.ok) {
      return authResult.response;
    }

    return NextResponse.json({
      isAdmin: true,
    });
  } catch (error) {
    console.error("Erro ao verificar acesso administrativo:", error);

    return NextResponse.json(
      { error: "Não foi possível verificar as permissões." },
      { status: 500 },
    );
  }
}