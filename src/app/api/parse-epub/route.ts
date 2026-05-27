import { NextRequest, NextResponse } from "next/server";
import { parseEpub } from "@/lib/epub";
import { uploadCoverBuffer } from "@/lib/cloudinary";

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
