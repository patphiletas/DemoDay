import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import ManuscriptSubmissionForm from "@/components/ManuscriptSubmissionForm";
import { auth } from "@/lib/auth";

export default async function SubmitManuscriptPage() {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (!session) {
    redirect("/signin");
  }

  return (
    <main className="page-shell">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <header className="border-b pb-6 rule">
          <Link
            href="/dashboard"
            className="text-sm font-semibold editorial-muted hover:text-[color:var(--accent-dark)]"
          >
            Retour au tableau de bord
          </Link>
          <h1 className="font-serif-display mt-4 text-5xl font-bold text-[color:var(--ink)]">
            Soumettre un manuscrit
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 editorial-muted">
            Votre texte sera enregistré avec le statut soumis. Il pourra ensuite
            être relu, accepté ou refusé par l&apos;équipe éditoriale.
          </p>
        </header>

        <section className="editorial-surface rounded-lg p-5">
          <ManuscriptSubmissionForm />
        </section>
      </div>
    </main>
  );
}
