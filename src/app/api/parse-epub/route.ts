import { NextRequest, NextResponse } from "next/server";
import { parseEpub } from "@/lib/epub";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || !file.name.endsWith(".epub")) {
    return NextResponse.json({ error: "Fichier EPUB invalide." }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)." }, { status: 413 });
  }

  try {
    const result = await parseEpub(file);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Impossible de lire ce fichier EPUB." }, { status: 422 });
  }
}
