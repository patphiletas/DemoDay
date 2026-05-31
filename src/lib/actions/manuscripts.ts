"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { manuscripts } from "@/db/schema";
import { uploadCover } from "@/lib/cloudinary";
import { db } from "@/lib/db";
import { actionError, type ActionState, validationActionError } from "@/lib/errors";
import { interactionRateLimit } from "@/lib/rate-limit";
import { requireSession } from "@/lib/session";
import { manuscriptSchema } from "@/lib/validation";

export type ManuscriptSubmissionState = ActionState;

export async function submitManuscriptAction(
  _prevState: ManuscriptSubmissionState,
  formData: FormData
): Promise<ManuscriptSubmissionState> {
  const userId = await requireSession();

  if (!interactionRateLimit("manuscript", userId)) {
    return actionError("Trop de soumissions. Réessaie dans une minute.");
  }

  const result = manuscriptSchema.safeParse({
    category: formData.get("category"),
    content: formData.get("content"),
    creditedAuthorName: formData.get("creditedAuthorName"),
    pitch: formData.get("pitch") || undefined,
    title: formData.get("title"),
  });

  if (!result.success) {
    return validationActionError(result.error);
  }

  const coverFile = formData.get("coverFile");
  const coverUrlInput = String(formData.get("coverImageUrl") ?? "").trim();
  let coverImageUrl: string | null = null;
  if (coverFile instanceof File && coverFile.size > 0) {
    try {
      coverImageUrl = await uploadCover(coverFile);
    } catch {
      return actionError("L'upload de l'image a échoué. Réessaie ou colle une URL.");
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
    pitch: result.data.pitch ?? null,
    status: "submitted",
    title: result.data.title,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
