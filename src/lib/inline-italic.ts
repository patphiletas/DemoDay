export type InlineSegment = { text: string; italic: boolean };

// Découpe un texte en segments normaux / italiques selon la convention *mot*
// produite par l'extraction EPUB. Un astérisque isolé reste tel quel, et
// l'italique ne traverse jamais un saut de ligne.
const ITALIC_RE = /\*([^*\n]+)\*/g;

export function splitItalic(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(ITALIC_RE)) {
    const start = match.index ?? 0;
    if (start > last) segments.push({ text: text.slice(last, start), italic: false });
    segments.push({ text: match[1], italic: true });
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), italic: false });
  return segments;
}
