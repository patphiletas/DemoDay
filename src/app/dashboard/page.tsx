import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { manuscripts, publications, ratings } from "@/db/schema";

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
        })
        .from(ratings)
        .innerJoin(publications, eq(ratings.publicationId, publications.id))
        .where(and(eq(ratings.userId, session.user.id), eq(ratings.score, 5)))
        .orderBy(desc(ratings.score), desc(ratings.createdAt))
        .limit(5),
      db
        .select({
          id: manuscripts.id,
          title: manuscripts.title,
          category: manuscripts.category,
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
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="flex flex-col gap-5 border-b border-zinc-200 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500">
              Bonjour {session.user.name}
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Tableau de bord</h1>
          </div>

          <Link
            href="/manuscripts/submit"
            className="inline-flex w-fit items-center justify-center rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
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
                    className="rounded-lg border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-medium">{book.title}</h2>
                        <p className="mt-1 text-xs text-zinc-500">
                          {book.category}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                        {book.score}/5
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-zinc-600">
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
                    className="rounded-lg border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-medium">{manuscript.title}</h2>
                        <p className="mt-1 text-xs text-zinc-500">
                          {manuscript.category ?? "Sans catégorie"}
                        </p>
                      </div>
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                        {statusLabel(manuscript.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-500">
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
                    className="rounded-lg border border-emerald-200 bg-white p-4"
                  >
                    <h2 className="font-medium">{manuscript.title}</h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      {manuscript.category ?? "Sans catégorie"}
                    </p>
                    <p className="mt-3 text-sm text-emerald-700">
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
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
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
    <div className="rounded-lg border border-zinc-200 bg-zinc-100/60 p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-500">
      {text}
    </div>
  );
}
