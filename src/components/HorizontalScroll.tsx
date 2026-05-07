"use client";

import { useRef } from "react";

export function HorizontalScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    ref.current?.scrollBy({ left: dir === "right" ? 340 : -340, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <button
        onClick={() => scroll("left")}
        aria-label="Précédent"
        className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-zinc-200 bg-white p-2 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-zinc-600 dark:text-zinc-300">
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        ref={ref}
        className="flex snap-x gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      <button
        onClick={() => scroll("right")}
        aria-label="Suivant"
        className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-zinc-200 bg-white p-2 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-zinc-600 dark:text-zinc-300">
          <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
