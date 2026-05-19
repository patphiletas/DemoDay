"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { manuscripts } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { manuscriptSchema } from "@/lib/validation";

export type ManuscriptSubmissionState = { error: string } | null;

export async function submitManuscriptAction(
  _prevState: ManuscriptSubmissionState,
  formData: FormData
): Promise<ManuscriptSubmissionState> {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (!session) {
    redirect("/signin");
  }

  const result = manuscriptSchema.safeParse({
    category: formData.get("category"),
    content: formData.get("content"),
    creditedAuthorName: formData.get("creditedAuthorName"),
    title: formData.get("title"),
  });

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  await db.insert(manuscripts).values({
    authorId: session.user.id,
    category: result.data.category,
    content: result.data.content,
    creditedAuthorName: result.data.creditedAuthorName,
    status: "submitted",
    title: result.data.title,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
