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
    <nav className="w-full border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-700 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          AlterNative
        </Link>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Mon espace
              </Link>
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {session.user.name}
              </span>
              <form action={signoutAction}>
                <button
                  type="submit"
                  className="text-sm text-zinc-400 transition-colors hover:text-red-500 dark:hover:text-red-400"
                >
                  Déconnexion
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Connexion
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
