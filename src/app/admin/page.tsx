import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { comments, manuscripts, publications, users } from "@/db/schema";
import {
  acceptManuscriptAction,
  deleteCommentAction,
  rejectManuscriptAction,
  restoreCommentAction,
  togglePublicationVisibilityAction,
  unpublishAction,
} from "@/lib/actions/admin";
import { alias } from "drizzle-orm/pg-core";

const manuscriptAuthors = alias(users, "manuscript_authors");
const publicationAuthors = alias(users, "publication_authors");
const commentAuthors = alias(users, "comment_authors");

export default async function AdminPage() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (!session) redirect("/signin");

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (currentUser?.role !== "admin") redirect("/");

  const [pendingManuscripts, allPublications, allComments] = await Promise.all([
    db
      .select({
        id: manuscripts.id,
        title: manuscripts.title,
        category: manuscripts.category,
        content: manuscripts.content,
        status: manuscripts.status,
        submittedAt: manuscripts.submittedAt,
        authorName: manuscriptAuthors.name,
        authorEmail: manuscriptAuthors.email,
        authorId: manuscripts.authorId,
      })
      .from(manuscripts)
      .innerJoin(manuscriptAuthors, eq(manuscripts.authorId, manuscriptAuthors.id))
      .where(eq(manuscripts.status, "submitted"))
      .orderBy(desc(manuscripts.submittedAt)),

    db
      .select({
        id: publications.id,
        title: publications.title,
        category: publications.category,
        slug: publications.slug,
        isVisible: publications.isVisible,
        publishedAt: publications.publishedAt,
        authorName: publicationAuthors.name,
      })
      .from(publications)
      .innerJoin(publicationAuthors, eq(publications.authorId, publicationAuthors.id))
      .orderBy(desc(publications.publishedAt)),

    db
      .select({
        id: comments.id,
        content: comments.content,
        isDeleted: comments.isDeleted,
        createdAt: comments.createdAt,
        publicationId: comments.publicationId,
        authorName: commentAuthors.name,
        authorEmail: commentAuthors.email,
        publicationTitle: publications.title,
      })
      .from(comments)
      .innerJoin(commentAuthors, eq(comments.authorId, commentAuthors.id))
      .innerJoin(publications, eq(comments.publicationId, publications.id))
      .orderBy(desc(comments.createdAt)),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-12">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Administration
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Bienvenue, {session.user.name}
          </p>
        </div>

        {/* Manuscrits en attente */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Manuscrits en attente
            </h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {pendingManuscripts.length}
            </span>
          </div>

          {pendingManuscripts.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucun manuscrit en attente.</p>
          ) : (
            <div className="space-y-4">
              {pendingManuscripts.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-950"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {m.title}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {m.authorName} · {m.authorEmail} · {m.category ?? "Sans catégorie"} ·{" "}
                        {new Date(m.submittedAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>

                  <details className="mb-4 group">
                    <summary className="cursor-pointer text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 select-none">
                      Lire le texte
                    </summary>
                    <div className="mt-2 max-h-96 overflow-y-auto rounded-md bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        {m.content}
                      </p>
                    </div>
                  </details>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Accepter */}
                    <form action={acceptManuscriptAction} className="space-y-2">
                      <input type="hidden" name="manuscriptId" value={m.id} />
                      <input
                        type="text"
                        name="pitch"
                        placeholder="Pitch (accroche pour la page d'accueil)"
                        required
                        className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <textarea
                        name="editorNote"
                        rows={2}
                        placeholder="Message pour l'auteur (optionnel)"
                        className="w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <button
                        type="submit"
                        className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Accepter et publier
                      </button>
                    </form>

                    {/* Refuser */}
                    <form action={rejectManuscriptAction} className="space-y-2">
                      <input type="hidden" name="manuscriptId" value={m.id} />
                      <textarea
                        name="reason"
                        rows={4}
                        placeholder="Motif du refus (envoyé à l'auteur)"
                        required
                        className="w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <button
                        type="submit"
                        className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
                      >
                        Refuser
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Publications */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Publications ({allPublications.length})
          </h2>

          {allPublications.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucune publication.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Titre</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Auteur</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Catégorie</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Statut</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                  {allPublications.map((pub) => (
                    <tr key={pub.id}>
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                        {pub.title}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{pub.authorName}</td>
                      <td className="px-4 py-3 text-zinc-500">{pub.category}</td>
                      <td className="px-4 py-3">
                        {pub.isVisible ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Visible
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                            Masquée
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <form action={togglePublicationVisibilityAction}>
                            <input type="hidden" name="publicationId" value={pub.id} />
                            <input type="hidden" name="isVisible" value={String(pub.isVisible)} />
                            <button
                              type="submit"
                              className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400"
                            >
                              {pub.isVisible ? "Masquer" : "Afficher"}
                            </button>
                          </form>
                          <form action={unpublishAction}>
                            <input type="hidden" name="publicationId" value={pub.id} />
                            <button
                              type="submit"
                              className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
                            >
                              Remettre en manuscrit
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Commentaires */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Commentaires ({allComments.length})
          </h2>

          {allComments.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucun commentaire.</p>
          ) : (
            <div className="space-y-3">
              {allComments.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-start gap-4 rounded-xl border p-4 ${
                    c.isDeleted
                      ? "border-zinc-100 bg-zinc-50 opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
                      : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
                  }`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {c.authorName}
                      </span>
                      <span className="text-xs text-zinc-400">{c.authorEmail}</span>
                      <span className="text-xs text-zinc-400">·</span>
                      <span className="text-xs text-zinc-400 italic">{c.publicationTitle}</span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{c.content}</p>
                    <p className="text-xs text-zinc-400">
                      {new Date(c.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {c.isDeleted && (
                        <span className="ml-2 text-red-400">Supprimé</span>
                      )}
                    </p>
                  </div>
                  <div>
                    {c.isDeleted ? (
                      <form action={restoreCommentAction}>
                        <input type="hidden" name="commentId" value={c.id} />
                        <button
                          type="submit"
                          className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400"
                        >
                          Restaurer
                        </button>
                      </form>
                    ) : (
                      <form action={deleteCommentAction}>
                        <input type="hidden" name="commentId" value={c.id} />
                        <button
                          type="submit"
                          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
                        >
                          Supprimer
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
