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
        creditedAuthorName: manuscripts.creditedAuthorName,
        content: manuscripts.content,
        status: manuscripts.status,
        submittedAt: manuscripts.submittedAt,
        submitterName: manuscriptAuthors.name,
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
        creditedAuthorName: publications.creditedAuthorName,
        slug: publications.slug,
        isVisible: publications.isVisible,
        publishedAt: publications.publishedAt,
        submitterName: publicationAuthors.name,
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
    <div className="page-shell">
      <div className="container-editorial max-w-5xl space-y-12">
        <div>
          <h1 className="font-serif-display text-5xl font-bold text-[color:var(--ink)]">
            Administration
          </h1>
          <p className="mt-2 text-sm editorial-muted">
            Bienvenue, {session.user.name}
          </p>
        </div>

        {/* Manuscrits en attente */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="font-serif-display text-2xl font-bold text-[color:var(--ink)]">
              Manuscrits en attente
            </h2>
            <span className="accent-chip rounded-full px-2 py-0.5 text-xs font-bold">
              {pendingManuscripts.length}
            </span>
          </div>

          {pendingManuscripts.length === 0 ? (
            <p className="text-sm editorial-muted">Aucun manuscrit en attente.</p>
          ) : (
            <div className="space-y-4">
              {pendingManuscripts.map((m) => (
                <div
                  key={m.id}
                  className="editorial-surface rounded-lg p-5"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-serif-display text-xl font-bold text-[color:var(--ink)]">
                        {m.title}
                      </p>
                      <p className="text-xs editorial-muted">
                        Œuvre de {m.creditedAuthorName} · Déposé par {m.submitterName} · {m.authorEmail} · {m.category ?? "Sans catégorie"} ·{" "}
                        {new Date(m.submittedAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>

                  <details className="mb-4 group">
                    <summary className="cursor-pointer select-none text-xs font-semibold editorial-muted hover:text-[color:var(--accent-dark)]">
                      Lire le texte
                    </summary>
                    <div className="mt-2 max-h-96 overflow-y-auto rounded-md bg-[color:var(--paper-muted)] px-4 py-3">
                      <p className="whitespace-pre-wrap font-serif-display text-base leading-7 text-[color:var(--ink)]">
                        {m.content}
                      </p>
                    </div>
                  </details>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Accepter */}
                    <form action={acceptManuscriptAction} encType="multipart/form-data" className="space-y-2">
                      <input type="hidden" name="manuscriptId" value={m.id} />
                      <input
                        type="text"
                        name="pitch"
                        placeholder="Pitch (accroche pour la page d'accueil)"
                        required
                        className="field px-3 py-2 text-sm"
                      />
                      <textarea
                        name="editorNote"
                        rows={2}
                        placeholder="Message pour l'auteur (optionnel)"
                        className="field resize-none px-3 py-2 text-sm"
                      />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold editorial-muted">Image de couverture</p>
                        <input
                          type="file"
                          name="coverFile"
                          accept="image/*"
                          className="w-full cursor-pointer rounded-md border border-(--line) bg-(--paper) px-3 py-1.5 text-xs text-(--ink-soft) file:mr-3 file:rounded file:border-0 file:bg-(--paper-muted) file:px-2 file:py-1 file:text-xs file:font-semibold file:text-(--ink)"
                        />
                        <input
                          type="url"
                          name="coverImageUrl"
                          placeholder="ou coller une URL d'image"
                          className="field px-3 py-2 text-sm"
                        />
                        <p className="text-xs editorial-muted">Le fichier a priorité sur l'URL.</p>
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded-md bg-[color:var(--sage)] px-3 py-2 text-sm font-bold text-white hover:bg-[color:var(--blueprint)]"
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
                        className="field resize-none px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
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
          <h2 className="font-serif-display text-2xl font-bold text-[color:var(--ink)]">
            Publications ({allPublications.length})
          </h2>

          {allPublications.length === 0 ? (
            <p className="text-sm editorial-muted">Aucune publication.</p>
          ) : (
            <div className="editorial-surface overflow-hidden rounded-lg">
              <table className="w-full text-sm">
                <thead className="border-b bg-[color:var(--paper-muted)] rule">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold editorial-muted">Titre</th>
                    <th className="px-4 py-3 text-left font-semibold editorial-muted">Auteur/autrice</th>
                    <th className="px-4 py-3 text-left font-semibold editorial-muted">Déposant</th>
                    <th className="px-4 py-3 text-left font-semibold editorial-muted">Catégorie</th>
                    <th className="px-4 py-3 text-left font-semibold editorial-muted">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold editorial-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--line)] bg-[color:var(--paper)]">
                  {allPublications.map((pub) => (
                    <tr key={pub.id}>
                      <td className="px-4 py-3 font-semibold text-[color:var(--ink)]">
                        {pub.title}
                      </td>
                      <td className="px-4 py-3 editorial-muted">{pub.creditedAuthorName}</td>
                      <td className="px-4 py-3 editorial-muted">{pub.submitterName}</td>
                      <td className="px-4 py-3 editorial-muted">{pub.category}</td>
                      <td className="px-4 py-3">
                        {pub.isVisible ? (
                          <span className="sage-chip rounded-full px-2 py-0.5 text-xs font-bold">
                            Visible
                          </span>
                        ) : (
                          <span className="muted-chip rounded-full px-2 py-0.5 text-xs font-bold">
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
                              className="rounded border border-[color:var(--line)] px-2 py-1 text-xs font-semibold editorial-muted hover:border-[color:var(--accent)]"
                            >
                              {pub.isVisible ? "Masquer" : "Afficher"}
                            </button>
                          </form>
                          <form action={unpublishAction}>
                            <input type="hidden" name="publicationId" value={pub.id} />
                            <button
                              type="submit"
                              className="accent-chip rounded border border-[color:var(--accent)] px-2 py-1 text-xs font-semibold"
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
          <h2 className="font-serif-display text-2xl font-bold text-[color:var(--ink)]">
            Commentaires ({allComments.length})
          </h2>

          {allComments.length === 0 ? (
            <p className="text-sm editorial-muted">Aucun commentaire.</p>
          ) : (
            <div className="space-y-3">
              {allComments.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-start gap-4 rounded-xl border p-4 ${
                    c.isDeleted
                      ? "border-[color:var(--line)] bg-[color:var(--paper-muted)] opacity-55"
                      : "editorial-surface"
                  }`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[color:var(--ink)]">
                        {c.authorName}
                      </span>
                      <span className="text-xs editorial-muted">{c.authorEmail}</span>
                      <span className="text-xs editorial-muted">·</span>
                      <span className="text-xs italic editorial-muted">{c.publicationTitle}</span>
                    </div>
                    <p className="text-sm leading-6 editorial-muted">{c.content}</p>
                    <p className="text-xs editorial-muted">
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
                          className="rounded border border-[color:var(--line)] px-2 py-1 text-xs font-semibold editorial-muted hover:border-[color:var(--accent)]"
                        >
                          Restaurer
                        </button>
                      </form>
                    ) : (
                      <form action={deleteCommentAction}>
                        <input type="hidden" name="commentId" value={c.id} />
                        <button
                          type="submit"
                          className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
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
