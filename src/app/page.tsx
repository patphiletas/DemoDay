import { headers } from "next/headers";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { PublicationCard } from "@/components/PublicationCard";
import { SessionPanel } from "@/components/SessionPanel";
import { and, avg, count, desc, eq, inArray } from "drizzle-orm";
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
      authorName: publicationAuthors.name,
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
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <main className="w-full max-w-5xl space-y-14">
        <div className="space-y-6 border-b border-zinc-200 pb-10 dark:border-zinc-700">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Édition indépendante
          </p>
          <h1 className="text-5xl font-bold leading-none tracking-tight text-zinc-400 dark:text-zinc-50 sm:text-6xl">
            AlterNative
          </h1>
          <p className="max-w-lg text-lg text-zinc-500 dark:text-zinc-400">
            lisez différemment.
          </p>
          {!session && (
            <div className="flex gap-3">
              <a
                href="/signup"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Rejoindre la revue
              </a>
              <a
                href="/signin"
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Se connecter
              </a>
            </div>
          )}
        </div>

        <section className="space-y-6">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Dernières publications</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Les textes récemment publiés par la communauté.
              </p>
            </div>
          </div>

          {featuredPublications.length > 0 ? (
            <HorizontalScroll>
              {featuredPublications.map((publication) => (
                <PublicationCard
                  key={publication.id}
                  publication={publication}
                  userScore={ratingByPublicationId.get(publication.id)}
                  ratingStat={ratingStatsByPublicationId.get(publication.id)}
                  comments={commentsByPublicationId.get(publication.id) ?? []}
                  isLoggedIn={!!session}
                />
              ))}
            </HorizontalScroll>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950">
              Aucune publication disponible pour le moment.
            </div>
          )}
        </section>

        <SessionPanel session={session} />
      </main>
    </div>
  );
}
