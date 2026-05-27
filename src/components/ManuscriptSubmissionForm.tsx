"use client";

import { useActionState, useRef, useState } from "react";
import { submitManuscriptAction } from "@/lib/actions/manuscripts";

const categories = [
  "Fiction",
  "Contemporain",
  "Poésie narrative",
  "Essai",
  "Nouvelle",
  "Science-fiction",
  "Les classiques",
];

export default function ManuscriptSubmissionForm() {
  const [state, formAction, isPending] = useActionState(submitManuscriptAction, null);
  const [epubLoading, setEpubLoading] = useState(false);
  const [epubError, setEpubError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);
  const authorRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  async function handleEpubChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setEpubLoading(true);
    setEpubError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/parse-epub", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setEpubError(data.error ?? "Erreur lors de l'import.");
        return;
      }

      if (titleRef.current && data.title) titleRef.current.value = data.title;
      if (authorRef.current && data.author) authorRef.current.value = data.author;
      if (contentRef.current && data.content) contentRef.current.value = data.content;
    } catch {
      setEpubError("Impossible de contacter le serveur.");
    } finally {
      setEpubLoading(false);
    }
  }

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-6">
      {state?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">{state.error}</p>
        </div>
      )}

      {/* Import EPUB */}
      <div className="rounded-lg border border-(--line) bg-(--paper-muted) p-4 space-y-2">
        <p className="text-sm font-semibold text-(--ink)">Importer un fichier EPUB</p>
        <p className="text-xs editorial-muted">
          Sélectionne un fichier <code>.epub</code> — titre, auteur et chapitres seront extraits automatiquement.
        </p>
        <input
          type="file"
          accept=".epub"
          onChange={handleEpubChange}
          disabled={epubLoading}
          className="w-full cursor-pointer rounded-md border border-(--line) bg-(--paper) px-3 py-1.5 text-xs text-(--ink-soft) file:mr-3 file:rounded file:border-0 file:bg-(--paper-muted) file:px-2 file:py-1 file:text-xs file:font-semibold file:text-(--ink) disabled:opacity-50"
        />
        {epubLoading && <p className="text-xs editorial-muted">Extraction en cours…</p>}
        {epubError && <p className="text-xs font-semibold text-red-600">{epubError}</p>}
        <p className="text-xs editorial-muted">
          Tu peux aussi remplir les champs ci-dessous manuellement, ou corriger les valeurs extraites.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-(--ink)">
            Titre
          </label>
          <input
            ref={titleRef}
            id="title"
            name="title"
            type="text"
            required
            minLength={5}
            maxLength={255}
            className="field mt-2 px-3 py-2 text-sm"
            placeholder="Titre du manuscrit"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-semibold text-(--ink)">
            Catégorie
          </label>
          <select
            id="category"
            name="category"
            required
            className="field mt-2 px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>Choisir</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="creditedAuthorName" className="block text-sm font-semibold text-(--ink)">
          Auteur/autrice crédité·e
        </label>
        <input
          ref={authorRef}
          id="creditedAuthorName"
          name="creditedAuthorName"
          type="text"
          required
          minLength={2}
          maxLength={255}
          className="field mt-2 px-3 py-2 text-sm"
          placeholder="Nom affiché sur la publication"
        />
        <p className="mt-2 text-xs editorial-muted">
          La signature publique de l&apos;œuvre peut être différente du compte qui dépose le texte.
        </p>
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-semibold text-(--ink)">
          Texte
        </label>
        <p className="mt-1 text-xs editorial-muted">
          Pour structurer en chapitres, commence chaque titre par <code>##</code> (ex : <code>## Chapitre 1</code>).
        </p>
        <textarea
          ref={contentRef}
          id="content"
          name="content"
          required
          minLength={100}
          rows={18}
          className="field mt-2 resize-y px-3 py-3 font-serif-display text-base leading-7"
          placeholder="Collez ou rédigez votre manuscrit ici."
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-(--ink)">
          Image de couverture <span className="font-normal editorial-muted">(optionnel)</span>
        </label>
        <div className="mt-2 space-y-2">
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
          <p className="text-xs editorial-muted">
            L'image sera soumise à validation éditoriale. Le fichier a priorité sur l'URL.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t pt-5 rule">
        <button
          type="submit"
          disabled={isPending || epubLoading}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Soumission..." : "Soumettre le manuscrit"}
        </button>
      </div>
    </form>
  );
}
