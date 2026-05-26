import Image from "next/image";
import Link from "next/link";

type Publication = {
  id: number;
  title: string;
  slug: string;
  category: string;
  pitch: string;
  coverImageUrl: string | null;
  publishedAt: Date;
  creditedAuthorName: string;
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
  userScore?: number | undefined;
  ratingStat?: RatingStat | undefined;
  comments: Comment[];
  isLoggedIn?: boolean;
  isNew?: boolean;
};

export function PublicationCard({
  publication,
  ratingStat,
  comments,
  isNew = false,
}: Props) {
  return (
    <article className="publication-card editorial-surface snap-start overflow-hidden rounded-lg">
      <Link href={`/publications/${publication.slug}`} className="publication-card-cover block bg-(--paper-muted)">
        {publication.coverImageUrl ? (
          <Image
            src={publication.coverImageUrl}
            alt={`Couverture de ${publication.title}`}
            width={900}
            height={1200}
            className="h-full w-full object-contain p-2 transition-opacity hover:opacity-90"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between bg-[color:var(--ink)] p-5 transition-opacity hover:opacity-95">
            <p className="editorial-label text-[color:var(--paper)] opacity-70">
              {publication.category}
            </p>
            <div>
              <p className="text-2xl font-bold leading-tight text-[color:var(--paper)] opacity-90 [font-stretch:condensed]">
                {publication.title}
              </p>
              <p className="mt-3 text-sm text-[color:var(--paper)] opacity-70">{publication.creditedAuthorName}</p>
            </div>
          </div>
        )}
      </Link>

      <div className="publication-card-body space-y-3 p-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="editorial-label">
              {publication.category}
            </p>
            {isNew && (
              <span className="new-chip rounded-full px-2 py-0.5 text-xs font-bold">
                Nouveauté
              </span>
            )}
          </div>
          <Link href={`/publications/${publication.slug}`}>
            <h3 className="mt-2 text-xl font-bold leading-tight text-[color:var(--ink-soft)] [font-stretch:condensed] hover:text-[color:var(--accent-dark)]">
              {publication.title}
            </h3>
          </Link>
          <p className="mt-1 text-sm editorial-muted">
            Œuvre de {publication.creditedAuthorName}
          </p>
          <p className="mt-0.5 text-xs editorial-muted">
            {new Date(publication.publishedAt).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <p className="publication-card-pitch line-clamp-3 text-sm leading-6 editorial-muted">
          {publication.pitch}
        </p>

        <div className="rounded-md bg-(--paper-muted) px-3 py-2 text-sm editorial-muted">
          {ratingStat ? (
            <span>
              Moyenne :{" "}
              <strong className="text-(--ink)">
                {ratingStat.average}/5
              </strong>{" "}
              ({ratingStat.count} avis)
            </span>
          ) : (
            <span>Aucune note pour le moment.</span>
          )}
        </div>

        <div className="publication-card-comments space-y-2 border-t pt-4 rule">
          <p className="editorial-label">
            Derniers commentaires
          </p>
          {comments.length > 0 ? (
            <div className="space-y-2">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-md bg-(--paper-muted) p-3 text-sm"
                >
                  <p className="font-semibold text-(--ink)">
                    {comment.authorName}
                  </p>
                  <p className="mt-1 line-clamp-3 editorial-muted">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm editorial-muted">Aucun commentaire pour le moment.</p>
          )}
        </div>
      </div>
    </article>
  );
}
