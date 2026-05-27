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
              <p className="text-2xl font-bold leading-tight text-[color:var(--paper)] opacity-90 font-stretch-condensed">
                {publication.title}
              </p>
              <p className="mt-3 text-sm text-[color:var(--paper)] opacity-70">{publication.creditedAuthorName}</p>
            </div>
          </div>
        )}
      </Link>

      <div className="publication-card-body space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="editorial-label">{publication.category}</p>
          {isNew && (
            <span className="new-chip rounded-full px-2 py-0.5 text-xs font-bold shrink-0">
              Nouveauté
            </span>
          )}
        </div>

        <Link href={`/publications/${publication.slug}`}>
          <h3 className="text-lg font-bold leading-tight text-(--ink-soft) font-stretch-condensed hover:text-(--accent-dark)">
            {publication.title}
          </h3>
        </Link>
        <p className="text-xs editorial-muted">{publication.creditedAuthorName}</p>

        <p className="publication-card-pitch line-clamp-2 text-sm leading-5 editorial-muted">
          {publication.pitch}
        </p>

        <div className="flex items-center gap-3 border-t pt-2 rule text-xs editorial-muted">
          {ratingStat && Number(ratingStat.count) > 0 ? (
            <span className="font-semibold text-(--ink)">
              ★ {ratingStat.average}
              <span className="ml-1 font-normal editorial-muted">({ratingStat.count})</span>
            </span>
          ) : (
            <span>Non noté</span>
          )}
          {comments.length > 0 && (
            <span>{comments.length} commentaire{comments.length > 1 ? "s" : ""}</span>
          )}
        </div>
      </div>
    </article>
  );
}
