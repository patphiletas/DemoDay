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
    <section className="editorial-panel space-y-3 rounded-lg p-5">
      <h2 className="editorial-label">Session</h2>
      {session ? (
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-[color:var(--sage)]">Connecté</p>
          <p className="editorial-muted">Nom : {session.user.name}</p>
          <p className="editorial-muted">Email : {session.user.email}</p>
          <p className="editorial-muted">
            Email vérifié : {session.user.emailVerified ? "Oui" : "Non"}
          </p>
          <p className="editorial-muted">
            Créé le : {session.user.createdAt?.toLocaleDateString()}
          </p>
          <p className="editorial-muted">ID : {session.user.id}</p>
          <p>
            <Link href="/dashboard" className="font-semibold text-[color:var(--blueprint)] hover:text-[color:var(--accent-dark)]">
              Accéder au tableau de bord
            </Link>
          </p>
        </div>
      ) : (
        <p className="text-sm editorial-muted">Non connecté</p>
      )}
    </section>
  );
}
