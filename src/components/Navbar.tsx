import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { signoutAction } from "@/lib/actions/auth";
import ThemeToggle from "@/components/ThemeToggle";

export default async function Navbar() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  return (
    <nav className="sticky top-0 z-20 w-full border-b bg-[color:var(--paper)] px-6 py-3 backdrop-blur-md rule">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="font-serif-display text-xl font-bold text-[color:var(--ink)]">
          AlterNative
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <ThemeToggle />
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-[color:var(--ink-soft)] transition-colors hover:text-[color:var(--accent-dark)]"
              >
                Mon espace
              </Link>
              <span className="hidden text-sm font-semibold text-[color:var(--ink)] sm:inline">
                {session.user.name}
              </span>
              <form action={signoutAction}>
                <button
                  type="submit"
                  className="text-sm font-medium text-[color:var(--ink-soft)] transition-colors hover:text-[color:var(--accent)]"
                >
                  Déconnexion
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="text-sm font-medium text-[color:var(--ink-soft)] transition-colors hover:text-[color:var(--accent-dark)]"
              >
                Connexion
              </Link>
              <Link
                href="/signup"
                className="btn-primary min-h-0 px-3 py-1.5"
              >
                S&apos;inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
