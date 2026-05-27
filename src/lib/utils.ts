export type Chapter = { title: string; content: string };

export function parseChapters(content: string): Chapter[] {
  const parts = content.split(/^## (.+)$/m);
  if (parts.length < 3) return [];
  const chapters: Chapter[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    chapters.push({
      title: parts[i].trim(),
      content: parts[i + 1]?.trim() ?? "",
    });
  }
  return chapters;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
