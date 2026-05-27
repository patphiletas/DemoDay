import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function requireSession(): Promise<string> {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (!session) redirect("/signin");

  return session.user.id;
}

export async function requireAdmin(): Promise<string> {
  const userId = await requireSession();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user?.role !== "admin") redirect("/");

  return userId;
}
