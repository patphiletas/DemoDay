import { headers } from "next/headers";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { PublicationCard } from "@/components/PublicationCard";
import { SessionPanel } from "@/components/SessionPanel";
import { and, avg, count, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comments, publications, ratings, users } from "@/db/schema";

const publicationAuthors = alias(users, "publication_authors");

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

  const featuredPublications = await db
    .select({
      id: publications.id,
      title: publications.title,
      slug: publications.slug,
      category: publications.category,
      pitch: publications.pitch,
      coverImageUrl: publications.coverImageUrl,
      publishedAt: publications.publishedAt,
      creditedAuthorName: publications.creditedAuthorName,
      isNew: sql<boolean>`${gt(publications.publishedAt, sql`now() - interval '7 days'`)}`,
    })
    .from(publications)
    .innerJoin(publicationAuthors, eq(publications.authorId, publicationAuthors.id))
    .where(eq(publications.isVisible, true))
    .orderBy(desc(publications.publishedAt))
    .limit(6);

  const publicationIds = featuredPublications.map((p) => p.id);

  const [userRatings, latestComments] = await Promise.all([
    session && publicationIds.length > 0
      ? db
          .select({ publicationId: ratings.publicationId, score: ratings.score })
          .from(ratings)
          .where(and(eq(ratings.userId, session.user.id), inArray(ratings.publicationId, publicationIds)))
      : Promise.resolve([]),
    publicationIds.length > 0
      ? db
          .select({
            id: comments.id,
            content: comments.content,
            publicationId: comments.publicationId,
            createdAt: comments.createdAt,
            authorName: users.name,
          })
          .from(comments)
          .innerJoin(users, eq(comments.authorId, users.id))
          .where(and(inArray(comments.publicationId, publicationIds), eq(comments.isDeleted, false)))
          .orderBy(desc(comments.createdAt))
          .limit(12)
      : Promise.resolve([]),
  ]);

  const ratingStats =
    publicationIds.length > 0
      ? await db
          .select({ average: avg(ratings.score), count: count(ratings.id), publicationId: ratings.publicationId })
          .from(ratings)
          .where(inArray(ratings.publicationId, publicationIds))
          .groupBy(ratings.publicationId)
      : [];

  const ratingByPublicationId = new Map(userRatings.map((r) => [r.publicationId, r.score]));

  const ratingStatsByPublicationId = new Map(
    ratingStats.map((r) => [
      r.publicationId,
      { average: r.average === null ? null : Number(r.average).toFixed(1), count: r.count },
    ])
  );
  const commentsByPublicationId = new Map<number, typeof latestComments>();
  for (const comment of latestComments) {
    const existing = commentsByPublicationId.get(comment.publicationId) ?? [];
    if (existing.length < 2) {
      commentsByPublicationId.set(comment.publicationId, [...existing, comment]);
    }
  }

  return (
    <div className="page-shell">
      <main className="container-editorial space-y-14">
        <div className="grid gap-8 border-b pb-10 rule lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div className="space-y-6">
            <p className="editorial-label">Édition indépendante</p>
            <h1 className="font-serif-display text-5xl font-bold leading-none text-[color:var(--ink)] sm:text-6xl md:text-7xl">
              AlterNative
            </h1>
            <p className="max-w-2xl text-xl leading-8 editorial-muted">
              Une revue pour découvrir, lire et faire circuler des textes hors des circuits trop sages.
            </p>
          </div>
          <div className="editorial-panel rounded-lg p-5">
            <p className="font-serif-display text-2xl leading-tight text-[color:var(--ink)]">
              Lire autrement, publier avec soin.
            </p>
            <p className="mt-3 text-sm leading-6 editorial-muted">
              Manuscrits, commentaires, notes et comité éditorial vivent au même endroit.
            </p>
          </div>
          {!session && (
            <div className="flex flex-wrap gap-3 lg:col-span-2">
              <a
                href="/signup"
                className="btn-primary"
              >
                Rejoindre la revue
              </a>
              <a
                href="/signin"
                className="btn-secondary"
              >
                Se connecter
              </a>
            </div>
          )}
        </div>

        <section className="space-y-6">
          <input id="compact-publications" type="checkbox" className="compact-toggle peer sr-only" />
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="font-serif-display text-3xl font-bold text-[color:var(--ink)]">Dernières publications</h2>
              <p className="mt-1 text-sm editorial-muted">
                Les textes récemment publiés par la communauté.
              </p>
            </div>
            <label
              htmlFor="compact-publications"
              className="btn-secondary min-h-0 cursor-pointer px-3 py-2 peer-checked:bg-[color:var(--ink)] peer-checked:text-[color:var(--paper)]"
            >
              Mode compact
            </label>
          </div>

          {featuredPublications.length > 0 ? (
            <div className="publication-feed">
              <HorizontalScroll>
                {featuredPublications.map((publication) => (
                  <PublicationCard
                    key={publication.id}
                    publication={publication}
                    userScore={ratingByPublicationId.get(publication.id)}
                  ratingStat={ratingStatsByPublicationId.get(publication.id)}
                  comments={commentsByPublicationId.get(publication.id) ?? []}
                  isLoggedIn={!!session}
                  isNew={publication.isNew}
                />
              ))}
              </HorizontalScroll>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-5 text-sm editorial-surface editorial-muted">
              Aucune publication disponible pour le moment.
            </div>
          )}
        </section>

        {/* <SessionPanel session={session} /> */}
      </main>
    </div>
  );
}
