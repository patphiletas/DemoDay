"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { comments, manuscripts, notifications, publications, ratings, users } from "@/db/schema";
import { db } from "@/lib/db";
import { uploadCover } from "@/lib/cloudinary";
import { sendManuscriptAcceptedEmail, sendManuscriptRejectedEmail } from "@/lib/email";
import { requireAdmin } from "@/lib/session";
import { slugify } from "@/lib/utils";

// Fix #1 — valide qu'un ID FormData est un entier positif
function getId(formData: FormData, key: string): number | null {
  const n = Number(formData.get(key));
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Fix #5 (critique) — logique de résolution de couverture extraite
async function resolveCoverImage(
  formData: FormData,
  fallback: string | null = null
): Promise<string | null> {
  const coverFile = formData.get("coverFile");
  const coverUrlInput = String(formData.get("coverImageUrl") ?? "").trim();
  if (coverFile instanceof File && coverFile.size > 0 && coverFile.type.startsWith("image/")) {
    const uploaded = await uploadCover(coverFile).catch(() => null);
    if (uploaded) return uploaded;
  }
  if (coverUrlInput) return coverUrlInput;
  return fallback;
}

export async function editManuscriptContentAction(formData: FormData) {
  await requireAdmin();

  const manuscriptId = getId(formData, "manuscriptId"); // Fix #1
  if (!manuscriptId) return;

  const title = String(formData.get("title") ?? "").trim();
  const creditedAuthorName = String(formData.get("creditedAuthorName") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!content || content.length < 10) return;

  await db
    .update(manuscripts)
    .set({
      ...(title && { title }),
      ...(creditedAuthorName && { creditedAuthorName }),
      content,
    })
    .where(eq(manuscripts.id, manuscriptId));

  revalidatePath("/admin");
}

export async function acceptManuscriptAction(formData: FormData) {
  await requireAdmin();

  const manuscriptId = getId(formData, "manuscriptId"); // Fix #1
  if (!manuscriptId) return;

  const editorNote = String(formData.get("editorNote") ?? "").trim();
  const pitch = String(formData.get("pitch") ?? "").trim();

  const manuscript = await db.query.manuscripts.findFirst({
    where: eq(manuscripts.id, manuscriptId),
  });
  if (!manuscript) return;

  const coverImageUrl = await resolveCoverImage(formData, manuscript.coverImageUrl ?? null); // Fix #5

  const author = await db.query.users.findFirst({
    where: eq(users.id, manuscript.authorId),
  });

  const baseSlug = slugify(manuscript.title);
  const slug = `${baseSlug}-${manuscriptId}`;

  try { // Fix #3 — gère une éventuelle collision de slug (acceptation simultanée)
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(publications)
        .values({
          slug,
          title: manuscript.title,
          content: manuscript.content,
          category: manuscript.category ?? "Autre",
          pitch: pitch || manuscript.title,
          coverImageUrl,
          creditedAuthorName: manuscript.creditedAuthorName,
          authorId: manuscript.authorId,
          isVisible: true,
        })
        .returning({ id: publications.id });

      await tx
        .update(manuscripts)
        .set({
          status: "accepted",
          reviewedAt: new Date(),
          pitch: pitch || manuscript.title,
          coverImageUrl: coverImageUrl ?? manuscript.coverImageUrl,
          publicationId: inserted.id, // Fix #4 — stocke la FK vers la publication
        })
        .where(eq(manuscripts.id, manuscriptId));

      await tx.insert(notifications).values({
        userId: manuscript.authorId,
        type: "manuscript_accepted",
        relatedId: manuscriptId,
        message: editorNote || "Votre manuscrit a été accepté et publié.",
      });
    });
  } catch {
    return; // slug déjà pris ou autre contrainte DB
  }

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

  const manuscriptId = getId(formData, "manuscriptId"); // Fix #1
  if (!manuscriptId) return;

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

  const publicationId = getId(formData, "publicationId"); // Fix #1
  if (!publicationId) return;

  const pub = await db.query.publications.findFirst({
    where: eq(publications.id, publicationId),
  });
  if (!pub) return;

  // Fix #4 — retrouve le manuscrit par FK directe (plus fiable que la correspondance par titre)
  // Fallback sur authorId+title pour les publications créées avant cette migration
  const relatedManuscript =
    (await db.query.manuscripts.findFirst({
      where: eq(manuscripts.publicationId, publicationId),
    })) ??
    (await db.query.manuscripts.findFirst({
      where: (m, { and, eq: eqFn }) =>
        and(eqFn(m.authorId, pub.authorId), eqFn(m.title, pub.title), eqFn(m.status, "accepted")),
    }));

  // Fix #2 — les suppressions sont dans une transaction atomique
  await db.transaction(async (tx) => {
    await tx.delete(ratings).where(eq(ratings.publicationId, publicationId));
    await tx.delete(comments).where(eq(comments.publicationId, publicationId));
    await tx.delete(publications).where(eq(publications.id, publicationId));
    // onDelete:"set null" sur manuscripts.publicationId gère le NULL automatiquement

    if (relatedManuscript) {
      await tx
        .update(manuscripts)
        .set({
          status: "submitted",
          reviewedAt: null,
          pitch: pub.pitch,
          coverImageUrl: pub.coverImageUrl ?? relatedManuscript.coverImageUrl,
        })
        .where(eq(manuscripts.id, relatedManuscript.id));
    }
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updatePublicationCoverAction(formData: FormData) {
  await requireAdmin();

  const publicationId = getId(formData, "publicationId"); // Fix #1
  if (!publicationId) return;

  const coverImageUrl = await resolveCoverImage(formData); // Fix #5
  if (!coverImageUrl) return;

  await db
    .update(publications)
    .set({ coverImageUrl })
    .where(eq(publications.id, publicationId));

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function togglePublicationVisibilityAction(formData: FormData) {
  await requireAdmin();

  const publicationId = getId(formData, "publicationId"); // Fix #1
  if (!publicationId) return;

  const currentVisible = formData.get("isVisible") === "true";

  await db
    .update(publications)
    .set({ isVisible: !currentVisible })
    .where(eq(publications.id, publicationId));

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteManuscriptAction(formData: FormData) {
  await requireAdmin();

  const manuscriptId = getId(formData, "manuscriptId"); // Fix #1
  if (!manuscriptId) return;

  await db.delete(manuscripts).where(eq(manuscripts.id, manuscriptId));

  revalidatePath("/admin");
}

export async function deleteCommentAction(formData: FormData) {
  await requireAdmin();

  const commentId = getId(formData, "commentId"); // Fix #1
  if (!commentId) return;

  await db
    .update(comments)
    .set({ isDeleted: true })
    .where(eq(comments.id, commentId));

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function restoreCommentAction(formData: FormData) {
  await requireAdmin();

  const commentId = getId(formData, "commentId"); // Fix #1
  if (!commentId) return;

  await db
    .update(comments)
    .set({ isDeleted: false })
    .where(eq(comments.id, commentId));

  revalidatePath("/admin");
  revalidatePath("/");
}
