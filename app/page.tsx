import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../src/lib/auth";
import DashboardClient from "./dashboard-client";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0b1020] text-slate-300">
          Carregando seu workspace...
        </main>
      }
    >
      <ProtectedDashboard />
    </Suspense>
  );
}

async function ProtectedDashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return <DashboardClient />;
}