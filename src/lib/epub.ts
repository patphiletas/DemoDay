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

// L'italique (<em>, <i>) est conservé sous forme *mot*, comme en Markdown :
// il porte du sens dans un texte littéraire (titres d'œuvres, mots étrangers,
// emphase). Les espaces en bordure restent à l'extérieur des astérisques.
function italicToMarkdown(_match: string, _tag: string, inner: string): string {
  // Italique couvrant plusieurs paragraphes : on garde la structure, pas l'italique
  // (un *…* ne peut pas traverser un saut de ligne).
  if (/<(p|br|div|h[1-6]|li)\b/i.test(inner)) return inner;
  const text = inner.replace(/<[^>]+>/g, "");
  if (!text.trim()) return text;
  const [, lead, core, trail] = text.match(/^(\s*)([\s\S]*?)(\s*)$/) ?? ["", "", text, ""];
  return `${lead}*${core}*${trail}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<head\b[\s\S]*?<\/head>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    // en HTML, retours à la ligne et tabulations du source = simples espaces ;
    // seuls <br> et les fins de bloc créent des sauts de ligne (ci-dessous)
    .replace(/\s+/g, " ")
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, italicToMarkdown)
    // fusionne les italiques fragmentés (export Word : <em>El</em><em>le</em>)
    .replace(/\*([ \t]*)\*/g, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    // fin de bloc (paragraphe, titre, div, liste…) = saut de paragraphe,
    // sinon un <h1>Titre</h1><p>Texte</p> donnerait « TitreTexte »
    .replace(/<\/(p|h[1-6]|div|li|blockquote|section|article|header|footer|tr)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    // entités nommées courantes
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&rsquo;/g, "’")
    .replace(/&lsquo;/g, "‘")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    // entités numériques décimales (ex : &#160; &#8217;)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    // entités numériques hexadécimales (ex : &#x00A0; &#x27;)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    // normalise les espaces insécables résiduels en espaces normaux
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
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

    const manifest = epub.manifest as Record<
      string,
      { id: string; href: string; mediaType?: string; "media-type"?: string }
    >;

    const chapters: string[] = [];

    async function extractText(id: string): Promise<string> {
      // Gère le cas où epub2 retourne un tuple [content, mime] ou directement une string
      const rawResult = await epub.getChapterRawAsync(id);
      const raw: string = Array.isArray(rawResult) ? rawResult[0] : (rawResult as string);
      return stripHtml(raw);
    }

    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

    // Passage 1 : utilise epub.flow (spine ordonné)
    for (const chapter of epub.flow) {
      const chapterId =
        chapter.id ??
        Object.values(manifest).find((item) => item.href === chapter.href)?.id;
      if (!chapterId) continue;
      try {
        const text = await extractText(chapterId);
        if (text.length < 20) continue;
        const chapterTitle = stripHtml(chapter.title?.trim() || "") || `Chapitre ${chapters.length + 1}`;
        // Les EPUBs incluent souvent le titre du chapitre dans le HTML du corps —
        // on supprime la première ligne si elle correspond au titre (doublon visuel).
        const firstLine = text.split("\n")[0] ?? "";
        const cleanText =
          normalize(firstLine) === normalize(chapterTitle)
            ? text.slice(firstLine.length).replace(/^\n+/, "")
            : text;
        chapters.push(`## ${chapterTitle}\n\n${cleanText}`);
      } catch {
        // chapitre illisible
      }
    }

    // Passage 2 (fallback) : si le flow est vide, parcourt le manifest HTML directement
    if (chapters.length === 0) {
      const htmlItems = Object.values(manifest).filter((item) => {
        const mt = item.mediaType ?? item["media-type"] ?? "";
        return mt.includes("html") || mt.includes("xhtml");
      });
      for (const item of htmlItems) {
        try {
          const text = await extractText(item.id);
          if (text.length < 20) continue;
          chapters.push(`## Chapitre ${chapters.length + 1}\n\n${text}`);
        } catch {
          // skip
        }
      }
    }

    const content = chapters.join("\n\n");

    // Tentative d'extraction de la couverture
    let coverBuffer: Buffer | undefined;
    try {
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
