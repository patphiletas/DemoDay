"use server";


import { revalidatePath } from "next/cache";
import { comments, ratings } from "@/db/schema";
import { db } from "@/lib/db";
import { interactionRateLimit } from "@/lib/rate-limit";
import { requireSession } from "@/lib/session";
import { commentSchema, ratingSchema } from "@/lib/validation";

export async function ratePublicationAction(formData: FormData) {
  const userId = await requireSession();
  const result = ratingSchema.safeParse({
    publicationId: Number(formData.get("publicationId")),
    score: Number(formData.get("score")),
  });

  if (!result.success) {
    return;
  }

  await db
    .insert(ratings)
    .values({ publicationId: result.data.publicationId, score: result.data.score, userId })
    .onConflictDoUpdate({
      target: [ratings.publicationId, ratings.userId],
      set: { score: result.data.score },
    });

  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function commentPublicationAction(formData: FormData) {
  const userId = await requireSession();

  if (!interactionRateLimit("comment", userId)) {
    return;
  }

  const result = commentSchema.safeParse({
    content: formData.get("content"),
    publicationId: Number(formData.get("publicationId")),
  });

  if (!result.success) {
    return;
  }

  await db.insert(comments).values({
    authorId: userId,
    content: result.data.content,
    publicationId: result.data.publicationId,
    isModerated: false,
    isDeleted: false,
  });

  revalidatePath("/");
}
