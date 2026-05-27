import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { and, asc, avg, count, desc, eq, gt, lt, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Image from "next/image";
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
      creditedAuthorName: publications.creditedAuthorName,
      submitterName: publicationAuthors.name,
      authorId: publications.authorId,
    })
    .from(publications)
    .innerJoin(publicationAuthors, eq(publications.authorId, publicationAuthors.id))
    .where(and(eq(publications.slug, slug), eq(publications.isVisible, true)))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!publication) notFound();

  const [ratingStats, allComments, userRating, prevDirect, nextDirect, firstPublication, lastPublication] = await Promise.all([
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

    // précédent direct (id inférieur)
    db
      .select({ slug: publications.slug, title: publications.title })
      .from(publications)
      .where(and(eq(publications.isVisible, true), lt(publications.id, publication.id)))
      .orderBy(desc(publications.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),

    // suivant direct (id supérieur)
    db
      .select({ slug: publications.slug, title: publications.title })
      .from(publications)
      .where(and(eq(publications.isVisible, true), gt(publications.id, publication.id)))
      .orderBy(asc(publications.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),

    // premier (wrap depuis la fin)
    db
      .select({ slug: publications.slug, title: publications.title })
      .from(publications)
      .where(and(eq(publications.isVisible, true), ne(publications.id, publication.id)))
      .orderBy(asc(publications.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),

    // dernier (wrap depuis le début)
    db
      .select({ slug: publications.slug, title: publications.title })
      .from(publications)
      .where(and(eq(publications.isVisible, true), ne(publications.id, publication.id)))
      .orderBy(desc(publications.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  const previousPublication = prevDirect ?? lastPublication;
  const nextPublication = nextDirect ?? firstPublication;

  const averageScore =
    ratingStats.average !== null ? Number(ratingStats.average).toFixed(1) : null;

  return (
    <div className="page-shell">
      <div className="container-editorial space-y-8">
        <nav className="grid gap-3 sm:grid-cols-3">
          {previousPublication ? (
            <Link href={`/publications/${previousPublication.slug}`} className="btn-secondary justify-start">
              ← Précédent
            </Link>
          ) : (
            <span className="btn-secondary justify-start opacity-45">← Précédent</span>
          )}
          <Link href="/" className="btn-secondary">
            Bibliothèque
          </Link>
          {nextPublication ? (
            <Link href={`/publications/${nextPublication.slug}`} className="btn-secondary justify-end">
              Suivant →
            </Link>
          ) : (
            <span className="btn-secondary justify-end opacity-45">Suivant →</span>
          )}
        </nav>

        <header className="grid gap-8 border-b pb-8 rule lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="editorial-surface overflow-hidden rounded-lg">
            {publication.coverImageUrl ? (
              <Image
                src={publication.coverImageUrl}
                alt={`Couverture de ${publication.title}`}
                width={900}
                height={1200}
                className="aspect-[4/5] h-full w-full bg-[color:var(--paper-muted)] object-contain p-3"
                unoptimized
                priority
              />
            ) : (
              <div className="flex aspect-[4/5] flex-col justify-between bg-[color:var(--ink)] p-6">
                <p className="editorial-label text-[color:var(--paper)] opacity-70">
                  {publication.category}
                </p>
                <div>
                  <p className="font-serif-display text-3xl font-bold leading-tight text-[color:var(--paper)]">
                    {publication.title}
                  </p>
                  <p className="mt-3 text-sm text-[color:var(--paper)] opacity-70">
                    {publication.creditedAuthorName}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 self-end">
            <p className="editorial-label">{publication.category}</p>
            <h1 className="font-serif-display text-5xl font-bold leading-tight text-[color:var(--ink)] md:text-6xl">
              {publication.title}
            </h1>
            <p className="text-sm editorial-muted">
              Auteur/autrice de l’œuvre : {publication.creditedAuthorName} ·{" "}
              {new Date(publication.publishedAt).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="text-xs editorial-muted">
              Déposé par {publication.submitterName}
            </p>
            <p className="font-serif-display text-xl italic leading-8 editorial-muted">
              {publication.pitch}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <a href="#texte" className="btn-secondary min-h-0 px-3 py-2">
                Lire
              </a>
              <a href="#avis" className="btn-secondary min-h-0 px-3 py-2">
                Avis et commentaires
              </a>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <article id="texte" className="order-2 lg:order-1">
            <div className="whitespace-pre-wrap font-serif-display text-lg leading-8 text-[color:var(--ink)]">
              {publication.content}
            </div>
          </article>

          <aside id="avis" className="order-1 space-y-6 lg:sticky lg:top-24 lg:order-2">
            <section className="editorial-surface space-y-4 rounded-lg p-5">
              <div>
                <p className="editorial-label">Avis</p>
                <p className="mt-2 font-serif-display text-3xl font-bold text-[color:var(--ink)]">
                  {averageScore ? `${averageScore}/5` : "Non noté"}
                </p>
                <p className="text-sm editorial-muted">
                  {ratingStats.count} avis
                </p>
              </div>

              {session ? (
                <form action={ratePublicationAction} className="space-y-2">
                  <input type="hidden" name="publicationId" value={publication.id} />
                  <p className="editorial-label">Votre note</p>
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="submit"
                        name="score"
                        value={score}
                        className={`rounded-md border px-2 py-2 text-sm font-semibold transition-colors ${
                          userRating?.score === score
                            ? "accent-chip border-[color:var(--accent)]"
                            : "border-[color:var(--line)] bg-[color:var(--paper)] text-[color:var(--ink-soft)] hover:border-[color:var(--accent)]"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </form>
              ) : (
                <Link
                  href="/signin"
                  className="font-semibold text-[color:var(--blueprint)] hover:text-[color:var(--accent-dark)]"
                >
                  Connectez-vous pour noter
                </Link>
              )}
            </section>

            <section className="editorial-surface space-y-4 rounded-lg p-5">
              <h2 className="editorial-label">Commentaires ({allComments.length})</h2>
              {session ? (
                <form action={commentPublicationAction} className="space-y-3">
                  <input type="hidden" name="publicationId" value={publication.id} />
                  <textarea
                    id="comment"
                    name="content"
                    rows={3}
                    maxLength={500}
                    required
                    placeholder="Votre commentaire…"
                    className="field resize-none px-3 py-2 text-sm"
                  />
                  <button type="submit" className="btn-primary w-full">
                    Publier
                  </button>
                </form>
              ) : (
                <Link
                  href="/signin"
                  className="font-semibold text-[color:var(--blueprint)] hover:text-[color:var(--accent-dark)]"
                >
                  Connectez-vous pour commenter
                </Link>
              )}

              {allComments.length === 0 ? (
                <p className="text-sm editorial-muted">Aucun commentaire pour le moment.</p>
              ) : (
                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                  {allComments.map((c) => (
                    <div key={c.id} className="rounded-md bg-[color:var(--paper-muted)] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[color:var(--ink)]">
                          {c.authorName}
                        </span>
                        <span className="text-xs editorial-muted">
                          {new Date(c.createdAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 editorial-muted">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </div>

      </div>
    </div>
  );
}
