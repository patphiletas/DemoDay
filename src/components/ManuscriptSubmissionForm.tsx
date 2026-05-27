"use client";

import { useActionState } from "react";
import { submitManuscriptAction } from "@/lib/actions/manuscripts";

const categories = [
  "Fiction",
  "Contemporain",
  "Poésie narrative",
  "Essai",
  "Nouvelle",
  "Science-fiction",
];

export default function ManuscriptSubmissionForm() {
  const [state, formAction, isPending] = useActionState(
    submitManuscriptAction,
    null
  );

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-6">
      {state?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">{state.error}</p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-semibold text-[color:var(--ink)]"
          >
            Titre
          </label>
          <input
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
          <label
            htmlFor="category"
            className="block text-sm font-semibold text-[color:var(--ink)]"
          >
            Catégorie
          </label>
          <select
            id="category"
            name="category"
            required
            className="field mt-2 px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Choisir
            </option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="creditedAuthorName"
          className="block text-sm font-semibold text-[color:var(--ink)]"
        >
          Auteur/autrice crédité·e
        </label>
        <input
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
        <label
          htmlFor="content"
          className="block text-sm font-semibold text-[color:var(--ink)]"
        >
          Texte
        </label>
        <textarea
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
          disabled={isPending}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Soumission..." : "Soumettre le manuscrit"}
        </button>
      </div>
    </form>
  );
}
