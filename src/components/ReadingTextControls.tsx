"use client";

import { useRef, useState } from "react";

type ChapterLink = {
  id: string;
  title: string;
};

const readingSizes = [
  { label: "Compact", text: "1rem", line: "1.85" },
  { label: "Confort", text: "1.125rem", line: "1.9" },
  { label: "Large", text: "1.25rem", line: "1.95" },
];

export default function ReadingTextControls({
  chapterLinks,
  children,
}: {
  chapterLinks?: ChapterLink[];
  children: React.ReactNode;
}) {
  const [sizeIndex, setSizeIndex] = useState(1);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const currentSize = readingSizes[sizeIndex];
  const hasChapters = chapterLinks !== undefined && chapterLinks.length > 0;

  return (
    <div
      className="space-y-6"
      style={
        {
          "--reading-text-size": currentSize.text,
          "--reading-line-height": currentSize.line,
        } as React.CSSProperties
      }
    >
      <div className="sticky top-14 z-10 rounded-lg border border-(--line) bg-(--paper) p-2 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          {hasChapters ? (
            <details ref={detailsRef} className="group relative">
              <summary className="flex min-h-9 cursor-pointer select-none items-center rounded-md border border-(--line) px-3 text-xs font-bold uppercase text-(--ink-soft) hover:text-(--ink)">
                Chap.
              </summary>
              <ol className="absolute left-0 top-11 z-20 max-h-72 w-[min(78vw,20rem)] space-y-1 overflow-y-auto rounded-lg border border-(--line) bg-(--paper) p-2 shadow-lg">
                {chapterLinks.map((chapter) => (
                  <li key={chapter.id}>
                    <a
                      href={`#${chapter.id}`}
                      onClick={() => { if (detailsRef.current) detailsRef.current.open = false; }}
                      className="block rounded px-2 py-2 text-sm text-(--ink-soft) hover:bg-(--paper-muted) hover:text-(--ink)"
                    >
                      {chapter.title}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          ) : (
            <span className="px-2 text-xs font-bold uppercase text-(--ink-soft)">
              Texte
            </span>
          )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSizeIndex((value) => Math.max(0, value - 1))}
            disabled={sizeIndex === 0}
            className="min-h-9 rounded-md border border-(--line) px-3 text-sm font-bold text-(--ink) disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Réduire la taille du texte"
          >
            A-
          </button>
          <span className="min-w-16 text-center text-xs font-semibold text-(--ink-soft)">
            {currentSize.label}
          </span>
          <button
            type="button"
            onClick={() => setSizeIndex((value) => Math.min(readingSizes.length - 1, value + 1))}
            disabled={sizeIndex === readingSizes.length - 1}
            className="min-h-9 rounded-md border border-(--line) px-3 text-base font-bold text-(--ink) disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Augmenter la taille du texte"
          >
            A+
          </button>
        </div>
        </div>
      </div>

      {children}
    </div>
  );
}
