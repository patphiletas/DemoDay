import { Suspense } from "react";
import { headers } from "next/headers";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { PublicationCard } from "@/components/PublicationCard";
import { SearchBar } from "@/components/SearchBar";
import { and, avg, count, desc, eq, gt, ilike, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comments, publications, ratings, users } from "@/db/schema";

const publicationAuthors = alias(users, "publication_authors");
const MAX_SEARCH_QUERY_LENGTH = 100;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [session, resolvedParams] = await Promise.all([
    auth.api.getSession({ headers: await headers() }).catch(() => null),
    searchParams,
  ]);

  const q =
    typeof resolvedParams.q === "string"
      ? resolvedParams.q.trim().slice(0, MAX_SEARCH_QUERY_LENGTH)
      : "";

  const searchFilter = q
    ? or(
        ilike(publications.title, `%${q}%`),
        ilike(publications.pitch, `%${q}%`),
        ilike(publications.category, `%${q}%`),
        ilike(publications.creditedAuthorName, `%${q}%`),
      )
    : undefined;

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
    .where(searchFilter ? and(eq(publications.isVisible, true), searchFilter) : eq(publications.isVisible, true))
    .orderBy(desc(publications.publishedAt));

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
            <h1 className="font-serif-display text-4xl font-bold leading-none text-(--ink) sm:text-6xl md:text-7xl">
              Alter<span className="text-(--ink)">Native</span>
            </h1>
            <p className="max-w-2xl text-lg leading-7 editorial-muted sm:text-xl sm:leading-8">
              Une autre manière de découvrir, lire et diffuser des textes originaux ou libres de droits.
            </p>
          </div>
   
          {/* {!session && (
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
          )} */}
        </div>

        <section className="space-y-6">
          <input id="compact-publications" type="checkbox" className="compact-toggle peer sr-only" />
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-serif-display text-2xl font-bold text-(--ink) sm:text-3xl">
                {q ? `Résultats pour « ${q} »` : "Dernières publications"}
              </h2>
              <p className="mt-1 text-sm editorial-muted">
                {q
                  ? `${featuredPublications.length} publication${featuredPublications.length !== 1 ? "s" : ""} trouvée${featuredPublications.length !== 1 ? "s" : ""}.`
                  : "Les textes récemment publiés par la communauté."}
              </p>
              <label
                htmlFor="compact-publications"
                className="mt-2 inline-block cursor-pointer select-none rounded-md border border-(--line) px-3 py-1.5 text-xs font-semibold editorial-muted hover:border-(--accent) hover:text-(--ink)"
              >
                Vue compacte
              </label>
            </div>
            <Suspense fallback={null}>
              <SearchBar />
            </Suspense>
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

      </main>
    </div>
  );
}
