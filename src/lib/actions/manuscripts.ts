"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { manuscripts } from "@/db/schema";
import { uploadCover } from "@/lib/cloudinary";
import { db } from "@/lib/db";
import { interactionRateLimit } from "@/lib/rate-limit";
import { requireSession } from "@/lib/session";
import { manuscriptSchema } from "@/lib/validation";

export type ManuscriptSubmissionState = { error: string } | null;

export async function submitManuscriptAction(
  _prevState: ManuscriptSubmissionState,
  formData: FormData
): Promise<ManuscriptSubmissionState> {
  const userId = await requireSession();

  if (!interactionRateLimit("manuscript", userId)) {
    return { error: "Trop de soumissions. Réessaie dans une minute." };
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

  const coverFile = formData.get("coverFile");
  const coverUrlInput = String(formData.get("coverImageUrl") ?? "").trim();
  let coverImageUrl: string | null = null;
  if (coverFile instanceof File && coverFile.size > 0) {
    try {
      coverImageUrl = await uploadCover(coverFile);
    } catch {
      return { error: "L'upload de l'image a échoué. Réessaie ou colle une URL." };
    }
  } else if (coverUrlInput) {
    coverImageUrl = coverUrlInput;
  }

  await db.insert(manuscripts).values({
    authorId: userId,
    category: result.data.category,
    content: result.data.content,
    creditedAuthorName: result.data.creditedAuthorName,
    coverImageUrl,
    status: "submitted",
    title: result.data.title,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
