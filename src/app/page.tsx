import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 dark:bg-black px-6">
      <main className="w-full max-w-lg space-y-10">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">AlterNative</h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">Lisons différemment…</p>
        </div>

        {/* Session status */}
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Session</h2>
          {session ? (
            <div className="space-y-1 text-sm">
              <p className="text-green-600 font-medium">Connecté</p>
              <p className="text-zinc-600 dark:text-zinc-400">Nom : {session.user.name}</p>
              <p className="text-zinc-600 dark:text-zinc-400">Email : {session.user.email}</p>
              <p className="text-zinc-600 dark:text-zinc-400">Email vérifié : {session.user.emailVerified ? "Oui" : "Non"}</p>
              <p className="text-zinc-600 dark:text-zinc-400">Nom : {session.user.name}</p>
              <p className="text-zinc-600 dark:text-zinc-400">Créé le : {session.user.createdAt?.toLocaleDateString()}</p>
              <p className="text-zinc-600 dark:text-zinc-400">ID : {session.user.id}</p>
              <p><a href="/dashboard" className="text-blue-500 hover:underline">
                Accéder au tableau de bord
              </a></p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Non connecté</p>
          )}
        </section>
  

        {/* Tables */}
        {/* <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Tables DB</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { label: "users", desc: "Comptes utilisateurs" },
              { label: "manuscripts", desc: "Manuscrits soumis" },
              { label: "publications", desc: "Textes publiés" },
              { label: "comments", desc: "Commentaires" },
              { label: "ratings", desc: "Notes (1-5)" },
              { label: "reports", desc: "Signalements" },
              { label: "notifications", desc: "Notifications" },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-lg bg-zinc-100 dark:bg-zinc-900 px-3 py-2">
                <p className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{label}</p>
                <p className="text-xs text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </section> */}
      </main>
    </div>
  );
}
