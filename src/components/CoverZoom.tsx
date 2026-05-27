"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Props = {
  src: string;
  alt: string;
};

export default function CoverZoom({ src, alt }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Agrandir la couverture"
        className="block w-full cursor-zoom-in"
      >
        <Image
          src={src}
          alt={alt}
          width={900}
          height={1200}
          className="aspect-[4/5] h-full w-full bg-(--paper-muted) object-contain p-3 transition-opacity hover:opacity-85"
          unoptimized
          priority
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-h-[90dvh] max-w-[90dvw]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={src}
              alt={alt}
              width={1200}
              height={1600}
              className="max-h-[90dvh] w-auto rounded-lg object-contain shadow-2xl"
              unoptimized
            />
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-(--paper) text-(--ink) shadow-md hover:bg-(--paper-muted)"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
