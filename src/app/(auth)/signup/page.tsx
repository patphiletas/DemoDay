'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signupAction } from '@/lib/actions/auth';

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signupAction, null);

  return (
    <div className="page-shell flex items-center justify-center">
      <div className="editorial-surface w-full max-w-md space-y-8 rounded-lg p-6 sm:p-8">
        <div>
          <p className="editorial-label text-center">Nouvelle voix</p>
          <h2 className="font-serif-display mt-3 text-center text-4xl font-bold text-[color:var(--ink)]">
            Créer un compte
          </h2>
          <p className="mt-2 text-center text-sm editorial-muted">
            Rejoignez notre maison d&apos;édition
          </p>
        </div>

        {state?.error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">{state.error}</p>
          </div>
        )}

        <form action={formAction} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[color:var(--ink)]">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="field mt-2 block px-3 py-2 text-sm"
                placeholder="vous@example.com"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-[color:var(--ink)]">
                Nom d&apos;utilisateur
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="field mt-2 block px-3 py-2 text-sm"
                placeholder="votre_pseudo"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-[color:var(--ink)]">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="field mt-2 block px-3 py-2 text-sm"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[color:var(--ink)]">
                Confirmer le mot de passe
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="field mt-2 block px-3 py-2 text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Inscription en cours...' : "S'inscrire"}
          </button>

          <p className="text-center text-sm editorial-muted">
            Vous avez déjà un compte?{' '}
            <Link href="/signin" className="font-semibold text-[color:var(--blueprint)] hover:text-[color:var(--accent-dark)]">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
