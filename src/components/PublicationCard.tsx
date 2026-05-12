import Image from "next/image";
import Link from "next/link";
import {
  commentPublicationAction,
  ratePublicationAction,
} from "@/lib/actions/publication-interactions";

type Publication = {
  id: number;
  title: string;
  slug: string;
  category: string;
  pitch: string;
  coverImageUrl: string | null;
  publishedAt: Date;
  authorName: string;
};

type Comment = {
  id: number;
  content: string;
  authorName: string;
};

type RatingStat = {
  average: string | null;
  count: number;
};

type Props = {
  publication: Publication;
  userScore: number | undefined;
  ratingStat: RatingStat | undefined;
  comments: Comment[];
  isLoggedIn: boolean;
};

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function PublicationCard({
  publication,
  userScore,
  ratingStat,
  comments,
  isLoggedIn,
}: Props) {
  const isNew = Date.now() - new Date(publication.publishedAt).getTime() < ONE_WEEK_MS;

  return (
    <article className="min-w-[260px] snap-start overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:min-w-[320px]">
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {publication.category}
            </p>
            {isNew && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                Nouveauté
              </span>
            )}
          </div>
          <Link href={`/publications/${publication.slug}`}>
            <h3 className="mt-1 text-lg font-semibold text-zinc-900 hover:underline underline-offset-2 dark:text-zinc-50">
              {publication.title}
            </h3>
          </Link>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            par {publication.authorName}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {new Date(publication.publishedAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <p className="line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
          {publication.pitch}
        </p>

        <div className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          {ratingStat ? (
            <span>
              Moyenne :{" "}
              <strong className="text-zinc-900 dark:text-zinc-50">
                {ratingStat.average}/5
              </strong>{" "}
              ({ratingStat.count} avis)
            </span>
          ) : (
            <span>Aucune note pour le moment.</span>
          )}
        </div>

        {isLoggedIn ? (
          <div className="space-y-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <form action={ratePublicationAction} className="space-y-2">
              <input type="hidden" name="publicationId" value={publication.id} />
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Votre note
              </p>
              <div className="grid grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="submit"
                    name="score"
                    value={score}
                    className={`rounded-md border px-2 py-1 text-sm font-medium transition-colors ${
                      userScore === score
                        ? "border-amber-300 bg-amber-100 text-amber-800"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </form>

            <form action={commentPublicationAction} className="space-y-2">
              <input type="hidden" name="publicationId" value={publication.id} />
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
          {comments.length > 0 ? (
            <div className="space-y-2">
              {comments.map((comment) => (
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
            <p className="text-sm text-zinc-400">Aucun commentaire pour le moment.</p>
          )}
        </div>
      </div>
    </article>
  );
}
