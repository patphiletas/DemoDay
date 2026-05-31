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
    <nav className="sticky top-0 z-20 w-full border-b bg-(--paper) px-3 py-2 backdrop-blur-md rule sm:px-6 sm:py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link href="/" className="font-serif-display text-lg font-bold text-(--ink) sm:text-xl">
          AlterNative
        </Link>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <ThemeToggle />
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-(--ink-soft) transition-colors hover:text-(--accent-dark)"
              >
                Mon espace
              </Link>
              <span className="hidden max-w-36 truncate text-sm font-semibold text-(--ink) md:inline">
                {session.user.name}
              </span>
              <form action={signoutAction}>
                <button
                  type="submit"
                  className="text-sm font-medium text-(--ink-soft) transition-colors hover:text-(--accent)"
                >
                  <span className="sm:hidden">Sortir</span>
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="text-sm font-medium text-(--ink-soft) transition-colors hover:text-(--accent-dark)"
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
