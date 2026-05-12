import Link from "next/link";

type Props = {
  session: {
    user: {
      name: string;
      email: string;
      emailVerified: boolean;
      createdAt?: Date | null;
      id: string;
    };
  } | null;
};

export function SessionPanel({ session }: Props) {
  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Session</h2>
      {session ? (
        <div className="space-y-1 text-sm">
          <p className="text-green-600 font-medium">Connecté</p>
          <p className="text-zinc-600 dark:text-zinc-400">Nom : {session.user.name}</p>
          <p className="text-zinc-600 dark:text-zinc-400">Email : {session.user.email}</p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Email vérifié : {session.user.emailVerified ? "Oui" : "Non"}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Créé le : {session.user.createdAt?.toLocaleDateString()}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">ID : {session.user.id}</p>
          <p>
            <Link href="/dashboard" className="text-blue-500 hover:underline">
              Accéder au tableau de bord
            </Link>
          </p>
        </div>
      ) : (
        <p className="text-sm text-zinc-400">Non connecté</p>
      )}
    </section>
  );
}
