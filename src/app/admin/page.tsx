import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments, manuscripts, publications, users } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import {
  acceptManuscriptAction,
  deleteCommentAction,
  deleteManuscriptAction,
  editManuscriptContentAction,
  rejectManuscriptAction,
  restoreCommentAction,
  togglePublicationVisibilityAction,
  unpublishAction,
  updatePublicationCoverAction,
} from "@/lib/actions/admin";
import { alias } from "drizzle-orm/pg-core";

const manuscriptAuthors = alias(users, "manuscript_authors");
const publicationAuthors = alias(users, "publication_authors");
const commentAuthors = alias(users, "comment_authors");

export default async function AdminPage() {
  const userId = await requireAdmin();

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  const [pendingManuscripts, rejectedManuscripts, allPublications, allComments] = await Promise.all([
    db
      .select({
        id: manuscripts.id,
        title: manuscripts.title,
        category: manuscripts.category,
        creditedAuthorName: manuscripts.creditedAuthorName,
        content: manuscripts.content,
        coverImageUrl: manuscripts.coverImageUrl,
        pitch: manuscripts.pitch,
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
        id: manuscripts.id,
        title: manuscripts.title,
        creditedAuthorName: manuscripts.creditedAuthorName,
        rejectionReason: manuscripts.rejectionReason,
        submittedAt: manuscripts.submittedAt,
        submitterName: manuscriptAuthors.name,
      })
      .from(manuscripts)
      .innerJoin(manuscriptAuthors, eq(manuscripts.authorId, manuscriptAuthors.id))
      .where(eq(manuscripts.status, "rejected"))
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
        coverImageUrl: publications.coverImageUrl,
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
          <h1 className="font-serif-display text-4xl font-bold text-(--ink) sm:text-5xl">
            Administration
          </h1>
          <p className="mt-2 text-sm editorial-muted">
            Bienvenue, {currentUser?.name}
          </p>
        </div>

        {/* Manuscrits en attente */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="font-serif-display text-2xl font-bold text-(--ink)">
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
                      <p className="font-serif-display text-lg font-bold text-(--ink) sm:text-xl">
                        {m.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 editorial-muted">
                        Œuvre de {m.creditedAuthorName} · Déposé par {m.submitterName} · {m.authorEmail} · {m.category ?? "Sans catégorie"} ·{" "}
                        {new Date(m.submittedAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>

                  <details className="mb-4 group">
                    <summary className="cursor-pointer select-none text-xs font-semibold editorial-muted hover:text-(--accent-dark)">
                      Lire / modifier le texte
                    </summary>
                    <form action={editManuscriptContentAction} className="mt-2 space-y-2">
                      <input type="hidden" name="manuscriptId" value={m.id} />
                      <input
                        type="text"
                        name="title"
                        defaultValue={m.title}
                        className="field px-3 py-2 text-sm font-semibold"
                      />
                      <input
                        type="text"
                        name="creditedAuthorName"
                        defaultValue={m.creditedAuthorName}
                        placeholder="Nom de l'auteur/autrice de l'œuvre"
                        className="field px-3 py-2 text-sm"
                      />
                      <textarea
                        name="content"
                        rows={16}
                        defaultValue={m.content}
                        className="field resize-y px-3 py-3 font-serif-display text-sm leading-7"
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-(--line) bg-(--paper) px-3 py-1.5 text-xs font-semibold text-(--ink-soft) hover:text-(--ink)"
                      >
                        Sauvegarder les modifications
                      </button>
                    </form>
                  </details>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Accepter */}
                    <form action={acceptManuscriptAction} encType="multipart/form-data" className="space-y-2">
                      <input type="hidden" name="manuscriptId" value={m.id} />
                      <input
                        type="text"
                        name="pitch"
                        placeholder="Pitch (accroche pour la page d'accueil)"
                        defaultValue={m.pitch ?? ""}
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
                        {m.coverImageUrl && (
                          <div className="flex items-center gap-3 rounded-md bg-(--paper-muted) p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.coverImageUrl}
                              alt="Couverture proposée"
                              className="h-16 w-12 rounded object-cover"
                            />
                            <p className="text-xs editorial-muted">
                              Image proposée par l&apos;auteur — conservée si aucune autre n&apos;est fournie.
                            </p>
                          </div>
                        )}
                        <input
                          type="file"
                          name="coverFile"
                          accept="image/*"
                          className="w-full cursor-pointer rounded-md border border-(--line) bg-(--paper) px-3 py-1.5 text-xs text-(--ink-soft) file:mr-3 file:rounded file:border-0 file:bg-(--paper-muted) file:px-2 file:py-1 file:text-xs file:font-semibold file:text-(--ink)"
                        />
                        <input
                          type="url"
                          name="coverImageUrl"
                          defaultValue={m.coverImageUrl ?? ""}
                          placeholder="ou coller une URL d'image"
                          className="field px-3 py-2 text-sm"
                        />
                        <p className="text-xs editorial-muted">Le fichier a priorité sur l&apos;URL.</p>
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded-md bg-(--sage) px-3 py-2 text-sm font-bold text-white hover:bg-(--blueprint)"
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

                  <form action={deleteManuscriptAction}>
                    <input type="hidden" name="manuscriptId" value={m.id} />
                    <button
                      type="submit"
                      className="mt-3 min-h-11 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-xs sm:text-red-400 sm:hover:bg-transparent sm:hover:text-red-600 sm:hover:underline"
                    >
                      Supprimer définitivement
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Publications */}
        <section className="space-y-4">
          <h2 className="font-serif-display text-2xl font-bold text-(--ink)">
            Publications ({allPublications.length})
          </h2>

          {allPublications.length === 0 ? (
            <p className="text-sm editorial-muted">Aucune publication.</p>
          ) : (
            <>
            <div className="space-y-3 md:hidden">
              {allPublications.map((pub) => (
                <article key={pub.id} className="editorial-surface space-y-4 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold leading-tight text-(--ink)">{pub.title}</h3>
                      <p className="mt-1 text-xs editorial-muted">
                        {pub.creditedAuthorName} · {pub.category}
                      </p>
                      <p className="mt-0.5 text-xs editorial-muted">Déposé par {pub.submitterName}</p>
                    </div>
                    {pub.isVisible ? (
                      <span className="sage-chip shrink-0 rounded-full px-2 py-0.5 text-xs font-bold">
                        Visible
                      </span>
                    ) : (
                      <span className="muted-chip shrink-0 rounded-full px-2 py-0.5 text-xs font-bold">
                        Masquée
                      </span>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <form action={togglePublicationVisibilityAction}>
                      <input type="hidden" name="publicationId" value={pub.id} />
                      <input type="hidden" name="isVisible" value={String(pub.isVisible)} />
                      <button
                        type="submit"
                        className="btn-secondary min-h-11 w-full px-3 py-2 text-sm"
                      >
                        {pub.isVisible ? "Masquer" : "Afficher"}
                      </button>
                    </form>
                    <form action={unpublishAction}>
                      <input type="hidden" name="publicationId" value={pub.id} />
                      <button
                        type="submit"
                        className="accent-chip min-h-11 w-full rounded-md border border-(--accent) px-3 py-2 text-sm font-bold"
                      >
                        Remettre en manuscrit
                      </button>
                    </form>
                  </div>

                  <details>
                    <summary className="cursor-pointer select-none text-sm font-semibold editorial-muted hover:text-(--accent-dark)">
                      {pub.coverImageUrl ? "Modifier la couverture" : "Ajouter une couverture"}
                    </summary>
                    <form action={updatePublicationCoverAction} encType="multipart/form-data" className="mt-3 space-y-2">
                      <input type="hidden" name="publicationId" value={pub.id} />
                      {pub.coverImageUrl && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={pub.coverImageUrl} alt="" className="h-20 rounded object-cover" />
                        </>
                      )}
                      <input
                        type="file"
                        name="coverFile"
                        accept="image/*"
                        className="w-full cursor-pointer rounded border border-(--line) bg-(--paper) px-2 py-2 text-xs text-(--ink-soft) file:mr-2 file:rounded file:border-0 file:bg-(--paper-muted) file:px-2 file:py-1 file:text-xs file:font-semibold"
                      />
                      <input
                        type="url"
                        name="coverImageUrl"
                        defaultValue={pub.coverImageUrl ?? ""}
                        placeholder="ou URL d'image"
                        className="field px-3 py-2 text-sm"
                      />
                      <button type="submit" className="btn-secondary min-h-11 w-full px-3 py-2 text-sm">
                        Enregistrer
                      </button>
                    </form>
                  </details>
                </article>
              ))}
            </div>

            <div className="editorial-surface hidden overflow-hidden rounded-lg md:block">
              <table className="w-full text-sm">
                <thead className="border-b bg-(--paper-muted) rule">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold editorial-muted">Titre</th>
                    <th className="px-4 py-3 text-left font-semibold editorial-muted">Auteur/autrice</th>
                    <th className="px-4 py-3 text-left font-semibold editorial-muted">Déposant</th>
                    <th className="px-4 py-3 text-left font-semibold editorial-muted">Catégorie</th>
                    <th className="px-4 py-3 text-left font-semibold editorial-muted">Statut</th>
                    <th className="px-4 py-3 text-left font-semibold editorial-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--line) bg-(--paper)">
                  {allPublications.map((pub) => (
                    <tr key={pub.id}>
                      <td className="px-4 py-3 font-semibold text-(--ink)">
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
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <form action={togglePublicationVisibilityAction}>
                              <input type="hidden" name="publicationId" value={pub.id} />
                              <input type="hidden" name="isVisible" value={String(pub.isVisible)} />
                              <button
                                type="submit"
                                className="rounded border border-(--line) px-2 py-1 text-xs font-semibold editorial-muted hover:border-(--accent)"
                              >
                                {pub.isVisible ? "Masquer" : "Afficher"}
                              </button>
                            </form>
                            <form action={unpublishAction}>
                              <input type="hidden" name="publicationId" value={pub.id} />
                              <button
                                type="submit"
                                className="accent-chip rounded border border-(--accent) px-2 py-1 text-xs font-semibold"
                              >
                                Remettre en manuscrit
                              </button>
                            </form>
                          </div>
                          <details>
                            <summary className="cursor-pointer select-none text-xs font-semibold editorial-muted hover:text-(--accent-dark)">
                              {pub.coverImageUrl ? "Modifier la couverture" : "Ajouter une couverture"}
                            </summary>
                            <form action={updatePublicationCoverAction} encType="multipart/form-data" className="mt-2 space-y-1">
                              <input type="hidden" name="publicationId" value={pub.id} />
                              {pub.coverImageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={pub.coverImageUrl} alt="" className="h-12 rounded object-cover" />
                              )}
                              <input
                                type="file"
                                name="coverFile"
                                accept="image/*"
                                className="w-full cursor-pointer rounded border border-(--line) bg-(--paper) px-2 py-1 text-xs text-(--ink-soft) file:mr-2 file:rounded file:border-0 file:bg-(--paper-muted) file:px-2 file:py-0.5 file:text-xs file:font-semibold"
                              />
                              <input
                                type="url"
                                name="coverImageUrl"
                                defaultValue={pub.coverImageUrl ?? ""}
                                placeholder="ou URL d'image"
                                className="field px-2 py-1 text-xs"
                              />
                              <button type="submit" className="rounded border border-(--line) bg-(--paper) px-2 py-1 text-xs font-semibold editorial-muted hover:text-(--ink)">
                                Enregistrer
                              </button>
                            </form>
                          </details>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>

        {/* Manuscrits refusés */}
        {rejectedManuscripts.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-serif-display text-2xl font-bold text-(--ink)">
              Manuscrits refusés ({rejectedManuscripts.length})
            </h2>
            <div className="divide-y divide-(--line) rounded-lg border border-(--line)">
              {rejectedManuscripts.map((m) => (
                <div key={m.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-(--ink)">{m.title}</p>
                    <p className="text-xs editorial-muted">
                      {m.creditedAuthorName} · déposé par {m.submitterName} ·{" "}
                      {new Date(m.submittedAt).toLocaleDateString("fr-FR")}
                    </p>
                    {m.rejectionReason && (
                      <p className="mt-0.5 truncate text-xs text-red-500">{m.rejectionReason}</p>
                    )}
                  </div>
                  <form action={deleteManuscriptAction} className="shrink-0">
                    <input type="hidden" name="manuscriptId" value={m.id} />
                    <button
                      type="submit"
                      className="min-h-11 w-full rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 sm:min-h-0 sm:w-auto sm:px-2 sm:py-1 sm:text-xs"
                    >
                      Supprimer
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Commentaires */}
        <section className="space-y-4">
          <h2 className="font-serif-display text-2xl font-bold text-(--ink)">
            Commentaires ({allComments.length})
          </h2>

          {allComments.length === 0 ? (
            <p className="text-sm editorial-muted">Aucun commentaire.</p>
          ) : (
            <div className="space-y-3">
              {allComments.map((c) => (
                <div
                  key={c.id}
                  className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-start ${
                    c.isDeleted
                      ? "border-(--line) bg-(--paper-muted) opacity-55"
                      : "editorial-surface"
                  }`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-(--ink)">
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
                  <div className="shrink-0">
                    {c.isDeleted ? (
                      <form action={restoreCommentAction}>
                        <input type="hidden" name="commentId" value={c.id} />
                        <button
                          type="submit"
                          className="min-h-11 w-full rounded border border-(--line) px-3 py-2 text-sm font-semibold editorial-muted hover:border-(--accent) sm:min-h-0 sm:w-auto sm:px-2 sm:py-1 sm:text-xs"
                        >
                          Restaurer
                        </button>
                      </form>
                    ) : (
                      <form action={deleteCommentAction}>
                        <input type="hidden" name="commentId" value={c.id} />
                        <button
                          type="submit"
                          className="min-h-11 w-full rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 sm:min-h-0 sm:w-auto sm:px-2 sm:py-1 sm:text-xs"
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
