import { NextRequest, NextResponse } from "next/server";
import { parseEpub } from "@/lib/epub";
import { uploadCoverBuffer } from "@/lib/cloudinary";
import { auth } from "@/lib/auth";
import { interactionRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Réservé aux utilisateurs connectés (seul le formulaire de soumission l'appelle) :
  // sans ça, n'importe qui pouvait envoyer des fichiers de 20 Mo en boucle et
  // remplir le compte Cloudinary avec des couvertures.
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Connecte-toi pour importer un EPUB." }, { status: 401 });
  }

  if (!(await interactionRateLimit("parse-epub", session.user.id))) {
    return NextResponse.json({ error: "Trop d'imports. Réessaie dans une minute." }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || !file.name.endsWith(".epub")) {
    return NextResponse.json({ error: "Fichier EPUB invalide." }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)." }, { status: 413 });
  }

  try {
    const { coverBuffer, ...result } = await parseEpub(file);

    let coverImageUrl: string | undefined;
    if (coverBuffer) {
      coverImageUrl = await uploadCoverBuffer(coverBuffer).catch(() => undefined);
    }

    return NextResponse.json({ ...result, coverImageUrl });
  } catch {
    return NextResponse.json({ error: "Impossible de lire ce fichier EPUB." }, { status: 422 });
  }
}
