"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function ErrorPage({ error, unstable_retry }: ErrorPageProps) {
  return (
    <div className="page-shell flex items-center justify-center">
      <section className="editorial-surface w-full max-w-2xl rounded-lg p-6 text-center sm:p-10">
        <p className="editorial-label">Incident de lecture</p>
        <h1 className="font-serif-display mt-4 text-4xl font-bold text-(--ink) sm:text-5xl">
          Une page s&apos;est refermée trop vite.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 editorial-muted">
          Une erreur temporaire a interrompu l&apos;affichage. Vous pouvez relancer le chargement
          ou revenir à l&apos;accueil.
        </p>

        {error.digest && (
          <p className="mt-5 text-xs editorial-muted">
            Référence technique : <span className="font-mono">{error.digest}</span>
          </p>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={unstable_retry} className="btn-primary">
            Réessayer
          </button>
          <Link href="/" className="btn-secondary">
            Retour à l&apos;accueil
          </Link>
        </div>
      </section>
    </div>
  );
}
