import { splitItalic } from "@/lib/inline-italic";

/** Affiche le texte d'un chapitre en rendant *mot* en italique. */
export function ReadingText({ text }: { text: string }) {
  return (
    <>
      {splitItalic(text).map((segment, i) =>
        segment.italic ? <em key={i}>{segment.text}</em> : segment.text,
      )}
    </>
  );
}
