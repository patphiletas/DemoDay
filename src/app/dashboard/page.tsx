import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (!session) {
    redirect("/signin");
  }

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Bienvenue {session.user.name}</p>
    </main>
  );
}