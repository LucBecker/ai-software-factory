import { auth } from "./auth";
import { NextResponse } from "next/server";

export async function requireSession(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Autenticação necessária." },
        { status: 401 },
      ),
    };
  }

  return {
    ok: true as const,
    session,
  };
}