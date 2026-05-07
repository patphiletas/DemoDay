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
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <header className="border-b border-zinc-200 pb-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-500 underline-offset-4 hover:text-zinc-950 hover:underline"
          >
            Retour au tableau de bord
          </Link>
          <h1 className="mt-4 text-3xl font-semibold">
            Soumettre un manuscrit
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Votre texte sera enregistré avec le statut soumis. Il pourra ensuite
            être relu, accepté ou refusé par l&apos;équipe éditoriale.
          </p>
        </header>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <ManuscriptSubmissionForm />
        </section>
      </div>
    </main>
  );
}
