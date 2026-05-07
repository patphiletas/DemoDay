import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { and, avg, count, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  commentPublicationAction,
  ratePublicationAction,
} from "@/lib/actions/publication-interactions";
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
  const publicationIds = featuredPublications.map((publication) => publication.id);
  const [userRatings, latestComments] = await Promise.all([
    session && publicationIds.length > 0
      ? db
          .select({
            publicationId: ratings.publicationId,
            score: ratings.score,
          })
          .from(ratings)
          .where(
            and(
              eq(ratings.userId, session.user.id),
              inArray(ratings.publicationId, publicationIds)
            )
          )
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
          .where(
            and(
              inArray(comments.publicationId, publicationIds),
              eq(comments.isDeleted, false)
            )
          )
          .orderBy(desc(comments.createdAt))
          .limit(12)
      : Promise.resolve([]),
  ]);
  const ratingByPublicationId = new Map(
    userRatings.map((rating) => [rating.publicationId, rating.score])
  );
  const ratingStats =
    publicationIds.length > 0
      ? await db
          .select({
            average: avg(ratings.score),
            count: count(ratings.id),
            publicationId: ratings.publicationId,
          })
          .from(ratings)
          .where(inArray(ratings.publicationId, publicationIds))
          .groupBy(ratings.publicationId)
      : [];
  const ratingStatsByPublicationId = new Map(
    ratingStats.map((rating) => [
      rating.publicationId,
      {
        average:
          rating.average === null ? null : Number(rating.average).toFixed(1),
        count: rating.count,
      },
    ])
  );
  const commentsByPublicationId = new Map<number, typeof latestComments>();

  for (const comment of latestComments) {
    const publicationComments =
      commentsByPublicationId.get(comment.publicationId) ?? [];
    if (publicationComments.length < 2) {
      commentsByPublicationId.set(comment.publicationId, [
        ...publicationComments,
        comment,
      ]);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-6 py-10 dark:bg-black">
      <main className="w-full max-w-5xl space-y-10">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">AlterNative</h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">Lisons différemment…</p>
        </div>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Publications
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Les derniers textes publiés par la communauté.
              </p>
            </div>
          </div>

          {featuredPublications.length > 0 ? (
            <HorizontalScroll>
              {featuredPublications.map((publication) => (
                <article
                  key={publication.id}
                  className="min-w-[260px] snap-start overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:min-w-[320px]"
                >
                  <Link href={`/publications/${publication.slug}`} className="block aspect-3/4 bg-zinc-100 dark:bg-zinc-900">
                    {publication.coverImageUrl ? (
                      <Image
                        src={publication.coverImageUrl}
                        alt={`Couverture de ${publication.title}`}
                        width={900}
                        height={1200}
                        className="h-full w-full object-cover transition-opacity hover:opacity-90"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col justify-end bg-linear-to-br from-zinc-600 to-zinc-900 p-5 transition-opacity hover:opacity-90">
                        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
                          {publication.category}
                        </p>
                        <p className="mt-2 text-lg font-semibold leading-snug text-white">
                          {publication.title}
                        </p>
                        <p className="mt-1 text-xs text-zinc-300">{publication.authorName}</p>
                      </div>
                    )}
                  </Link>
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                        {publication.category}
                      </p>
                      <Link href={`/publications/${publication.slug}`}>
                        <h3 className="mt-1 text-lg font-semibold text-zinc-900 hover:underline underline-offset-2 dark:text-zinc-50">
                          {publication.title}
                        </h3>
                      </Link>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        par {publication.authorName}
                      </p>
                    </div>
                    <p className="line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {publication.pitch}
                    </p>

                    <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                      {ratingStatsByPublicationId.get(publication.id) ? (
                        <span>
                          Moyenne :{" "}
                          <strong className="text-zinc-900 dark:text-zinc-50">
                            {
                              ratingStatsByPublicationId.get(publication.id)
                                ?.average
                            }
                            /5
                          </strong>{" "}
                          ({ratingStatsByPublicationId.get(publication.id)?.count}{" "}
                          avis)
                        </span>
                      ) : (
                        <span>Aucune note pour le moment.</span>
                      )}
                    </div>

                    {session ? (
                      <div className="space-y-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        <form action={ratePublicationAction} className="space-y-2">
                          <input
                            type="hidden"
                            name="publicationId"
                            value={publication.id}
                          />
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                            Votre note
                          </p>
                          <div className="grid grid-cols-5 gap-1">
                            {[1, 2, 3, 4, 5].map((score) => {
                              const activeScore =
                                ratingByPublicationId.get(publication.id);

                              return (
                                <button
                                  key={score}
                                  type="submit"
                                  name="score"
                                  value={score}
                                  className={`rounded-md border px-2 py-1 text-sm font-medium transition-colors ${
                                    activeScore === score
                                      ? "border-amber-300 bg-amber-100 text-amber-800"
                                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                                  }`}
                                >
                                  {score}
                                </button>
                              );
                            })}
                          </div>
                        </form>

                        <form
                          action={commentPublicationAction}
                          className="space-y-2"
                        >
                          <input
                            type="hidden"
                            name="publicationId"
                            value={publication.id}
                          />
                          <label
                            htmlFor={`comment-${publication.id}`}
                            className="text-xs font-medium uppercase tracking-wide text-zinc-400"
                          >
                            Commenter
                          </label>
                          <textarea
                            id={`comment-${publication.id}`}
                            name="content"
                            rows={3}
                            maxLength={500}
                            required
                            placeholder="Votre commentaire"
                            className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                          />
                          <button
                            type="submit"
                            className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                          >
                            Publier
                          </button>
                        </form>
                      </div>
                    ) : (
                      <Link
                        href="/signin"
                        className="inline-flex text-sm font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
                      >
                        Connectez-vous pour noter et commenter
                      </Link>
                    )}

                    <div className="space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                        Derniers commentaires
                      </p>
                      {(commentsByPublicationId.get(publication.id) ?? [])
                        .length > 0 ? (
                        <div className="space-y-2">
                          {commentsByPublicationId
                            .get(publication.id)
                            ?.map((comment) => (
                              <div
                                key={comment.id}
                                className="rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-900"
                              >
                                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                                  {comment.authorName}
                                </p>
                                <p className="mt-1 line-clamp-3 text-zinc-600 dark:text-zinc-400">
                                  {comment.content}
                                </p>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400">
                          Aucun commentaire pour le moment.
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </HorizontalScroll>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              Aucune publication disponible pour le moment.
            </div>
          )}
        </section>

        {/* Session status */}
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Session</h2>
          {session ? (
            <div className="space-y-1 text-sm">
              <p className="text-green-600 font-medium">Connecté</p>
              <p className="text-zinc-600 dark:text-zinc-400">Nom : {session.user.name}</p>
              <p className="text-zinc-600 dark:text-zinc-400">Email : {session.user.email}</p>
              <p className="text-zinc-600 dark:text-zinc-400">Email vérifié : {session.user.emailVerified ? "Oui" : "Non"}</p>
              <p className="text-zinc-600 dark:text-zinc-400">Nom : {session.user.name}</p>
              <p className="text-zinc-600 dark:text-zinc-400">Créé le : {session.user.createdAt?.toLocaleDateString()}</p>
              <p className="text-zinc-600 dark:text-zinc-400">ID : {session.user.id}</p>
              <p><Link href="/dashboard" className="text-blue-500 hover:underline">
                Accéder au tableau de bord
              </Link></p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Non connecté</p>
          )}
        </section>

        {/* Tables */}
        {/* <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Tables DB</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: "users", desc: "Comptes utilisateurs" },
              { label: "manuscripts", desc: "Manuscrits soumis" },
              { label: "publications", desc: "Textes publiés" },
              { label: "comments", desc: "Commentaires" },
              { label: "ratings", desc: "Notes (1-5)" },
              { label: "reports", desc: "Signalements" },
              { label: "notifications", desc: "Notifications" },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-lg bg-zinc-100 dark:bg-zinc-900 px-3 py-2">
                <p className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{label}</p>
                <p className="text-xs text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </section> */}
      </main>
    </div>
  );
}
