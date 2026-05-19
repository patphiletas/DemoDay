import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { manuscripts, publications, ratings, users } from "@/db/schema";

const publicationAuthors = alias(users, "publication_authors");

function formatDate(date: Date | null) {
  if (!date) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    accepted: "Accepté",
    published: "Publié",
    rejected: "Refusé",
    submitted: "Soumis",
    reviewing: "En lecture",
  };

  return labels[status] ?? status;
}

export default async function DashboardPage() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (!session) {
    redirect("/signin");
  }

  const [favoriteBooks, submittedManuscripts, acceptedManuscripts] =
    await Promise.all([
      db
        .select({
          id: publications.id,
          title: publications.title,
          category: publications.category,
          pitch: publications.pitch,
          slug: publications.slug,
          score: ratings.score,
          creditedAuthorName: publications.creditedAuthorName,
        })
        .from(ratings)
        .innerJoin(publications, eq(ratings.publicationId, publications.id))
        .innerJoin(publicationAuthors, eq(publications.authorId, publicationAuthors.id))
        .where(and(eq(ratings.userId, session.user.id), eq(ratings.score, 5)))
        .orderBy(desc(ratings.score), desc(ratings.createdAt))
        .limit(5),
      db
        .select({
          id: manuscripts.id,
          title: manuscripts.title,
          category: manuscripts.category,
          creditedAuthorName: manuscripts.creditedAuthorName,
          status: manuscripts.status,
          submittedAt: manuscripts.submittedAt,
        })
        .from(manuscripts)
        .where(eq(manuscripts.authorId, session.user.id))
        .orderBy(desc(manuscripts.submittedAt))
        .limit(5),
      db
        .select({
          id: manuscripts.id,
          title: manuscripts.title,
          category: manuscripts.category,
          creditedAuthorName: manuscripts.creditedAuthorName,
          reviewedAt: manuscripts.reviewedAt,
        })
        .from(manuscripts)
        .where(
          and(
            eq(manuscripts.authorId, session.user.id),
            eq(manuscripts.status, "accepted")
          )
        )
        .orderBy(desc(manuscripts.reviewedAt), desc(manuscripts.submittedAt))
        .limit(5),
  ]);

  return (
    <main className="page-shell">
      <div className="container-editorial space-y-8">
        <header className="flex flex-col gap-5 border-b pb-8 rule md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold editorial-muted">
              Bonjour {session.user.name}
            </p>
            <h1 className="font-serif-display mt-2 text-5xl font-bold text-[color:var(--ink)]">Tableau de bord</h1>
          </div>

          <Link
            href="/manuscripts/submit"
            className="btn-primary w-fit"
          >
            Soumettre un manuscrit
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <DashboardMetric label="Livres préférés" value={favoriteBooks.length} />
          <DashboardMetric
            label="Manuscrits soumis"
            value={submittedManuscripts.length}
          />
          <DashboardMetric
            label="Manuscrits acceptés"
            value={acceptedManuscripts.length}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <DashboardPanel title="Livres préférés">
            {favoriteBooks.length > 0 ? (
              <div className="space-y-3">
                {favoriteBooks.map((book) => (
                  <article
                    key={book.id}
                    className="editorial-surface rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-serif-display text-lg font-bold text-[color:var(--ink)]">{book.title}</h2>
                        <p className="mt-1 text-xs editorial-muted">
                          {book.category}
                        </p>
                        <p className="mt-1 text-xs editorial-muted">
                          Œuvre de {book.creditedAuthorName}
                        </p>
                      </div>
                      <span className="accent-chip rounded-full px-2 py-1 text-xs font-bold">
                        {book.score}/5
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 editorial-muted">
                      {book.pitch}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="Aucun livre favori pour le moment." />
            )}
          </DashboardPanel>

          <DashboardPanel title="Manuscrits soumis">
            {submittedManuscripts.length > 0 ? (
              <div className="space-y-3">
                {submittedManuscripts.map((manuscript) => (
                  <article
                    key={manuscript.id}
                    className="editorial-surface rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-serif-display text-lg font-bold text-[color:var(--ink)]">{manuscript.title}</h2>
                        <p className="mt-1 text-xs editorial-muted">
                          Œuvre de {manuscript.creditedAuthorName}
                        </p>
                        <p className="mt-1 text-xs editorial-muted">
                          {manuscript.category ?? "Sans catégorie"}
                        </p>
                      </div>
                      <span className="muted-chip rounded-full px-2 py-1 text-xs font-bold">
                        {statusLabel(manuscript.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm editorial-muted">
                      Soumis le {formatDate(manuscript.submittedAt)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="Aucun manuscrit soumis pour le moment." />
            )}
          </DashboardPanel>

          <DashboardPanel title="Manuscrits acceptés">
            {acceptedManuscripts.length > 0 ? (
              <div className="space-y-3">
                {acceptedManuscripts.map((manuscript) => (
                  <article
                    key={manuscript.id}
                    className="editorial-surface rounded-lg p-4"
                  >
                    <h2 className="font-serif-display text-lg font-bold text-[color:var(--ink)]">{manuscript.title}</h2>
                    <p className="mt-1 text-xs editorial-muted">
                      Œuvre de {manuscript.creditedAuthorName}
                    </p>
                    <p className="mt-1 text-xs editorial-muted">
                      {manuscript.category ?? "Sans catégorie"}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-[color:var(--sage)]">
                      Accepté le {formatDate(manuscript.reviewedAt)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="Aucun manuscrit accepté pour le moment." />
            )}
          </DashboardPanel>
        </section>
      </div>
    </main>
  );
}

function DashboardMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="editorial-surface rounded-lg p-5">
      <p className="text-sm font-semibold editorial-muted">{label}</p>
      <p className="font-serif-display mt-2 text-4xl font-bold text-[color:var(--ink)]">{value}</p>
    </div>
  );
}

function DashboardPanel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="editorial-panel rounded-lg p-4">
      <h2 className="editorial-label mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed p-5 text-sm editorial-surface editorial-muted">
      {text}
    </div>
  );
}
