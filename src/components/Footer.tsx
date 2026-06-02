export default function Footer() {
  return (
    <footer className="border-t border-(--line) bg-(--paper-muted) px-4 py-4 text-sm text-(--ink-soft)">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} AlterNative — Patrice Philetas</p>

        <p className="text-xs">
          Next.js · TypeScript · Drizzle ORM · PostgreSQL · Tailwind CSS · Cloudinary
        </p>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com/patphiletas"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-(--accent) transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://linkedin.com/in/patricephiletas"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-(--accent) transition-colors"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}
