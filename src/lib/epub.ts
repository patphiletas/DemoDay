import { EPub } from "epub2";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

export type ParsedEpub = {
  title: string;
  author: string;
  content: string;
  coverBuffer?: Buffer;
};

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function parseEpub(file: File): Promise<ParsedEpub> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const tmpPath = join(tmpdir(), `epub-${Date.now()}.epub`);

  try {
    await writeFile(tmpPath, buffer);
    const epub = await EPub.createAsync(tmpPath);

    const title = epub.metadata.title ?? "";
    const author = epub.metadata.creator ?? "";

    const chapters: string[] = [];

    for (const chapter of epub.flow) {
      if (!chapter.id) continue;
      try {
        const [raw] = await epub.getChapterRawAsync(chapter.id);
        const text = stripHtml(raw);
        if (text.length < 50) continue;

        const chapterTitle = chapter.title?.trim()
          ? chapter.title.trim()
          : `Chapitre ${chapters.length + 1}`;

        chapters.push(`## ${chapterTitle}\n\n${text}`);
      } catch {
        // chapitre illisible, on ignore
      }
    }

    const content = chapters.join("\n\n");

    // Tentative d'extraction de la couverture
    let coverBuffer: Buffer | undefined;
    try {
      const manifest = epub.manifest as Record<string, { id: string; href: string; mediaType?: string; "media-type"?: string }>;
      const coverId =
        (epub.metadata as Record<string, unknown>).cover as string | undefined ??
        Object.values(manifest).find(
          (item) =>
            (item.mediaType ?? item["media-type"] ?? "").startsWith("image/") &&
            (item.id?.toLowerCase().includes("cover") || item.href?.toLowerCase().includes("cover"))
        )?.id;

      if (coverId) {
        const [imgBuffer] = await epub.getImageAsync(coverId);
        coverBuffer = Buffer.from(imgBuffer as Buffer);
      }
    } catch {
      // couverture non disponible
    }

    return { title, author, content, coverBuffer };
  } finally {
    await unlink(tmpPath).catch(() => null);
  }
}
