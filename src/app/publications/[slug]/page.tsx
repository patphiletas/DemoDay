import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { and, avg, count, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import {
  commentPublicationAction,
  ratePublicationAction,
} from "@/lib/actions/publication-interactions";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comments, publications, ratings, users } from "@/db/schema";

const publicationAuthors = alias(users, "publication_authors");
const commentAuthors = alias(users, "comment_authors");

export default async function PublicationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

  const publication = await db
    .select({
      id: publications.id,
      title: publications.title,
      content: publications.content,
      category: publications.category,
      pitch: publications.pitch,
      coverImageUrl: publications.coverImageUrl,
      publishedAt: publications.publishedAt,
      authorName: publicationAuthors.name,
      authorId: publications.authorId,
    })
    .from(publications)
    .innerJoin(publicationAuthors, eq(publications.authorId, publicationAuthors.id))
    .where(and(eq(publications.slug, slug), eq(publications.isVisible, true)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!publication) notFound();

  const [ratingStats, allComments, userRating] = await Promise.all([
    db
      .select({ average: avg(ratings.score), count: count(ratings.id) })
      .from(ratings)
      .where(eq(ratings.publicationId, publication.id))
      .then((rows) => rows[0]),

    db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        authorName: commentAuthors.name,
      })
      .from(comments)
      .innerJoin(commentAuthors, eq(comments.authorId, commentAuthors.id))
      .where(
        and(
          eq(comments.publicationId, publication.id),
          eq(comments.isDeleted, false)
        )
      )
      .orderBy(desc(comments.createdAt)),

    session
      ? db.query.ratings.findFirst({
          where: and(
            eq(ratings.publicationId, publication.id),
            eq(ratings.userId, session.user.id)
          ),
        })
      : Promise.resolve(null),
  ]);

  const averageScore =
    ratingStats.average !== null ? Number(ratingStats.average).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-black">
      <div className="mx-auto max-w-2xl space-y-10">

        {/* Header */}
        <div className="space-y-3">
          <Link
            href="/"
            className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            ← Retour
          </Link>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {publication.category}
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
            {publication.title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            par {publication.authorName} ·{" "}
            {new Date(publication.publishedAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
          {averageScore && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {averageScore}/5 · {ratingStats.count} avis
            </p>
          )}
          <p className="italic text-zinc-600 dark:text-zinc-400">{publication.pitch}</p>
        </div>

        {/* Texte */}
        <article className="prose prose-zinc dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-base leading-relaxed text-zinc-800 dark:text-zinc-200">
            {publication.content}
          </div>
        </article>

        {/* Rating + commentaire */}
        {session ? (
          <div className="space-y-6 border-t border-zinc-200 pt-8 dark:border-zinc-700">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Votre note
              </p>
              <form action={ratePublicationAction} className="flex gap-2">
                <input type="hidden" name="publicationId" value={publication.id} />
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="submit"
                    name="score"
                    value={score}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                      userRating?.score === score
                        ? "border-amber-300 bg-amber-100 text-amber-800"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </form>
            </div>

            <form action={commentPublicationAction} className="space-y-3">
              <input type="hidden" name="publicationId" value={publication.id} />
              <label
                htmlFor="comment"
                className="text-xs font-medium uppercase tracking-wide text-zinc-400"
              >
                Laisser un commentaire
              </label>
              <textarea
                id="comment"
                name="content"
                rows={4}
                maxLength={500}
                required
                placeholder="Votre commentaire…"
                className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              />
              <button
                type="submit"
                className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Publier
              </button>
            </form>
          </div>
        ) : (
          <div className="border-t border-zinc-200 pt-8 dark:border-zinc-700">
            <Link
              href="/signin"
              className="text-sm font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
            >
              Connectez-vous pour noter et commenter
            </Link>
          </div>
        )}

        {/* Commentaires */}
        <div className="space-y-4 border-t border-zinc-200 pt-8 dark:border-zinc-700">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Commentaires ({allComments.length})
          </h2>
          {allComments.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucun commentaire pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {allComments.map((c) => (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {c.authorName}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(c.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
