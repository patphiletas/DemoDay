"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { comments, ratings } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { interactionRateLimit } from "@/lib/rate-limit";
import { commentSchema, ratingSchema } from "@/lib/validation";

async function requireUserId() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (!session) {
    redirect("/signin");
  }

  return session.user.id;
}

export async function ratePublicationAction(formData: FormData) {
  const userId = await requireUserId();
  const result = ratingSchema.safeParse({
    publicationId: Number(formData.get("publicationId")),
    score: Number(formData.get("score")),
  });

  if (!result.success) {
    return;
  }

  const existingRating = await db.query.ratings.findFirst({
    where: and(
      eq(ratings.publicationId, result.data.publicationId),
      eq(ratings.userId, userId)
    ),
  });

  if (existingRating) {
    await db
      .update(ratings)
      .set({ score: result.data.score })
      .where(eq(ratings.id, existingRating.id));
  } else {
    await db.insert(ratings).values({
      publicationId: result.data.publicationId,
      score: result.data.score,
      userId,
    });
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function commentPublicationAction(formData: FormData) {
  const userId = await requireUserId();

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
