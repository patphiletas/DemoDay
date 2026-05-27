"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { comments, manuscripts, notifications, publications, users } from "@/db/schema";
import { db } from "@/lib/db";
import { uploadCover } from "@/lib/cloudinary";
import { sendManuscriptAcceptedEmail, sendManuscriptRejectedEmail } from "@/lib/email";
import { requireAdmin } from "@/lib/session";
import { slugify } from "@/lib/utils";

export async function editManuscriptContentAction(formData: FormData) {
  await requireAdmin();

  const manuscriptId = Number(formData.get("manuscriptId"));
  const content = String(formData.get("content") ?? "").trim();

  if (!content || content.length < 10) return;

  await db
    .update(manuscripts)
    .set({ content })
    .where(eq(manuscripts.id, manuscriptId));

  revalidatePath("/admin");
}

export async function acceptManuscriptAction(formData: FormData) {
  await requireAdmin();

  const manuscriptId = Number(formData.get("manuscriptId"));
  const editorNote = String(formData.get("editorNote") ?? "").trim();
  const pitch = String(formData.get("pitch") ?? "").trim();

  const manuscript = await db.query.manuscripts.findFirst({
    where: eq(manuscripts.id, manuscriptId),
  });

  if (!manuscript) return;

  const coverFile = formData.get("coverFile");
  const coverUrlInput = String(formData.get("coverImageUrl") ?? "").trim();
  let coverImageUrl: string | null = null;
  if (coverFile instanceof File && coverFile.size > 0 && coverFile.type.startsWith("image/")) {
    coverImageUrl = await uploadCover(coverFile);
  } else if (coverUrlInput) {
    coverImageUrl = coverUrlInput;
  } else {
    // fallback : image proposée par l'auteur à la soumission
    coverImageUrl = manuscript.coverImageUrl ?? null;
  }

  const author = await db.query.users.findFirst({
    where: eq(users.id, manuscript.authorId),
  });

  const baseSlug = slugify(manuscript.title);
  const slug = `${baseSlug}-${manuscriptId}`;

  await db.transaction(async (tx) => {
    await tx.insert(publications).values({
      slug,
      title: manuscript.title,
      content: manuscript.content,
      category: manuscript.category ?? "Autre",
      pitch: pitch || manuscript.title,
      coverImageUrl,
      creditedAuthorName: manuscript.creditedAuthorName,
      authorId: manuscript.authorId,
      isVisible: true,
    });

    await tx
      .update(manuscripts)
      .set({ status: "accepted", reviewedAt: new Date() })
      .where(eq(manuscripts.id, manuscriptId));

    await tx.insert(notifications).values({
      userId: manuscript.authorId,
      type: "manuscript_accepted",
      relatedId: manuscriptId,
      message: editorNote || "Votre manuscrit a été accepté et publié.",
    });
  });

  if (author) {
    sendManuscriptAcceptedEmail(
      author.email,
      author.name,
      manuscript.title,
      editorNote,
      slug
    ).catch(() => null);
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function rejectManuscriptAction(formData: FormData) {
  await requireAdmin();

  const manuscriptId = Number(formData.get("manuscriptId"));
  const reason = String(formData.get("reason") ?? "").trim();

  const manuscript = await db.query.manuscripts.findFirst({
    where: eq(manuscripts.id, manuscriptId),
  });

  if (!manuscript) return;

  const author = await db.query.users.findFirst({
    where: eq(users.id, manuscript.authorId),
  });

  await db
    .update(manuscripts)
    .set({
      status: "rejected",
      reviewedAt: new Date(),
      rejectionReason: reason || "Manuscrit non retenu.",
    })
    .where(eq(manuscripts.id, manuscriptId));

  await db.insert(notifications).values({
    userId: manuscript.authorId,
    type: "manuscript_rejected",
    relatedId: manuscriptId,
    message: reason || "Votre manuscrit n'a pas été retenu.",
  });

  if (author) {
    sendManuscriptRejectedEmail(
      author.email,
      author.name,
      manuscript.title,
      reason
    ).catch(() => null);
  }

  revalidatePath("/admin");
}

export async function unpublishAction(formData: FormData) {
  await requireAdmin();

  const publicationId = Number(formData.get("publicationId"));

  const pub = await db.query.publications.findFirst({
    where: eq(publications.id, publicationId),
  });

  if (!pub) return;

  await db.delete(publications).where(eq(publications.id, publicationId));

  // Repasse le manuscrit accepté de cet auteur avec ce titre en "submitted"
  const relatedManuscript = await db.query.manuscripts.findFirst({
    where: (m, { and, eq: eqFn }) =>
      and(eqFn(m.authorId, pub.authorId), eqFn(m.title, pub.title), eqFn(m.status, "accepted")),
  });

  if (relatedManuscript) {
    await db
      .update(manuscripts)
      .set({ status: "submitted", reviewedAt: null })
      .where(eq(manuscripts.id, relatedManuscript.id));
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function togglePublicationVisibilityAction(formData: FormData) {
  await requireAdmin();

  const publicationId = Number(formData.get("publicationId"));
  const currentVisible = formData.get("isVisible") === "true";

  await db
    .update(publications)
    .set({ isVisible: !currentVisible })
    .where(eq(publications.id, publicationId));

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteCommentAction(formData: FormData) {
  await requireAdmin();

  const commentId = Number(formData.get("commentId"));

  await db
    .update(comments)
    .set({ isDeleted: true })
    .where(eq(comments.id, commentId));

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function restoreCommentAction(formData: FormData) {
  await requireAdmin();

  const commentId = Number(formData.get("commentId"));

  await db
    .update(comments)
    .set({ isDeleted: false })
    .where(eq(comments.id, commentId));

  revalidatePath("/admin");
  revalidatePath("/");
}
