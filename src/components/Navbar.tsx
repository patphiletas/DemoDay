import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { signoutAction } from "@/lib/actions/auth";

export default async function Navbar() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  return (
    <nav className="w-full border-b px-6 py-3 flex items-center justify-between">
      <Link href="/" className="font-bold text-lg">AlterNative</Link>

      <div className="flex items-center gap-4">
        {session ? (
          <>
            <span className="text-sm text-gray-600">{session.user.name}</span>
            <form action={signoutAction}>
              <button type="submit" className="text-sm text-red-500 hover:underline">
                Se déconnecter
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/signin" className="text-sm hover:underline">Connexion</Link>
            <Link
              href="/signup"
              className="text-sm bg-black text-white px-3 py-1 rounded hover:bg-gray-800"
            >
              S&apos;inscrire
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
