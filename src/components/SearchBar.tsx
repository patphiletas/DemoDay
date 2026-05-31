"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentQuery = searchParams.get("q") ?? "";
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const nextQuery = value.trim();
    if (nextQuery === currentQuery) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParamsString);
      if (nextQuery) {
        params.set("q", nextQuery);
      } else {
        params.delete("q");
      }
      const queryString = params.toString();
      router.replace(queryString ? `/?${queryString}` : "/");
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentQuery, router, searchParamsString, value]);

  return (
    <div className="relative w-full max-w-md">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--ink-soft)]"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
      >
        <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Titre, auteur, catégorie…"
        className="w-full rounded-md border border-[color:var(--line)] bg-[color:var(--paper)] py-2 pl-9 pr-4 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
      />
    </div>
  );
}
