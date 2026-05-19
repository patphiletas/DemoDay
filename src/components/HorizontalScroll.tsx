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
        className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[color:var(--line)] bg-[color:var(--paper)] p-2 shadow-sm hover:border-[color:var(--accent)]"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[color:var(--ink-soft)]">
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
        className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[color:var(--line)] bg-[color:var(--paper)] p-2 shadow-sm hover:border-[color:var(--accent)]"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[color:var(--ink-soft)]">
          <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
