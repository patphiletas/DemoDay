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
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{state.error}</p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-zinc-700"
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
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500"
            placeholder="Titre du manuscrit"
          />
        </div>

        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-zinc-700"
          >
            Catégorie
          </label>
          <select
            id="category"
            name="category"
            required
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition-colors focus:border-zinc-500"
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
          htmlFor="content"
          className="block text-sm font-medium text-zinc-700"
        >
          Texte
        </label>
        <textarea
          id="content"
          name="content"
          required
          minLength={100}
          rows={18}
          className="mt-2 w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm leading-6 text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500"
          placeholder="Collez ou rédigez votre manuscrit ici."
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-5">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Soumission..." : "Soumettre le manuscrit"}
        </button>
      </div>
    </form>
  );
}
