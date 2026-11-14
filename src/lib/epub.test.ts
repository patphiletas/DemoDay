import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import { parseEpub, stripHtml } from "./epub";

// ─── Fabrication d'un EPUB minimal en mémoire ────────────────────────────────

type Chapter = { id: string; title: string; html: string };

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function buildEpub({
  title = "Le Livre",
  author = "Jeanne Auteure",
  chapters,
  withCover = false,
}: {
  title?: string;
  author?: string;
  chapters: Chapter[];
  withCover?: boolean;
}): File {
  const zip = new AdmZip();
  zip.addFile("mimetype", Buffer.from("application/epub+zip"));
  zip.addFile(
    "META-INF/container.xml",
    Buffer.from(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`),
  );

  const manifest = chapters
    .map((c) => `<item id="${c.id}" href="${c.id}.xhtml" media-type="application/xhtml+xml"/>`)
    .join("\n");
  const spine = chapters.map((c) => `<itemref idref="${c.id}"/>`).join("\n");

  zip.addFile(
    "OEBPS/content.opf",
    Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:identifier id="uid">test-epub</dc:identifier>
    <dc:language>fr</dc:language>
    ${withCover ? '<meta name="cover" content="cover-image"/>' : ""}
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifest}
    ${withCover ? '<item id="cover-image" href="cover.png" media-type="image/png"/>' : ""}
  </manifest>
  <spine toc="ncx">${spine}</spine>
</package>`),
  );

  const navPoints = chapters
    .map(
      (c, i) => `<navPoint id="np${i}" playOrder="${i + 1}">
  <navLabel><text>${c.title}</text></navLabel><content src="${c.id}.xhtml"/>
</navPoint>`,
    )
    .join("\n");
  zip.addFile(
    "OEBPS/toc.ncx",
    Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="test-epub"/></head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>${navPoints}</navMap>
</ncx>`),
  );

  for (const c of chapters) {
    zip.addFile(
      `OEBPS/${c.id}.xhtml`,
      Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${c.title}</title></head>
<body>${c.html}</body></html>`),
    );
  }
  if (withCover) zip.addFile("OEBPS/cover.png", PNG_1PX);

  return new File([new Uint8Array(zip.toBuffer())], "livre.epub", { type: "application/epub+zip" });
}

// ─── stripHtml ───────────────────────────────────────────────────────────────

describe("stripHtml", () => {
  it("convertit les paragraphes et sauts de ligne", () => {
    expect(stripHtml("<p>Un.</p><p>Deux<br/>trois.</p>")).toBe("Un.\n\nDeux\ntrois.");
  });

  it("supprime scripts et styles", () => {
    expect(stripHtml("<style>p{}</style><p>Texte</p><script>alert(1)</script>")).toBe("Texte");
  });

  it("décode les entités nommées, décimales et hexadécimales", () => {
    expect(stripHtml("&laquo;&nbsp;Oui&nbsp;&raquo; &#8217; &#x2014; &amp;")).toBe("« Oui » ’ — &");
  });

  it("conserve l'italique en *mot*", () => {
    expect(stripHtml("<p>Il lut <em>Les Misérables</em> et <i>Candide</i>.</p>")).toBe(
      "Il lut *Les Misérables* et *Candide*.",
    );
  });

  it("garde les espaces de bordure hors des astérisques", () => {
    expect(stripHtml("<p>un<em> mot </em>ici</p>")).toBe("un *mot* ici");
  });

  it("fusionne les italiques fragmentés par un export Word", () => {
    expect(stripHtml("<p>[<em>El</em><em>le n</em><em>e fournit</em> <em>que</em> <em>s</em><em>on prénom.</em>]</p>")).toBe(
      "[*Elle ne fournit que son prénom.*]",
    );
  });

  it("ne fusionne pas deux italiques de paragraphes différents", () => {
    expect(stripHtml("<p><em>Un.</em></p><p><em>Deux.</em></p>")).toBe("*Un.*\n\n*Deux.*");
  });

  it("garde les paragraphes d'un italique qui en couvre plusieurs", () => {
    expect(stripHtml("<em><p>Un.</p><p>Deux.</p></em>")).toBe("Un.\n\nDeux.");
  });

  it("traite les retours à la ligne du source HTML comme des espaces", () => {
    expect(stripHtml("<p>Les\n   Aventures de <i>Sherlock\nHolmes</i></p>\n<p>Suite</p>")).toBe(
      "Les Aventures de *Sherlock Holmes*\n\nSuite",
    );
  });

  it("ignore un italique vide et nettoie les balises imbriquées", () => {
    expect(stripHtml("<p>A<i> </i>B <em><span>c</span></em></p>")).toBe("A B *c*");
  });
});

// ─── parseEpub ───────────────────────────────────────────────────────────────

describe("parseEpub", () => {
  it("extrait titre, auteur et chapitres dans l'ordre du spine", async () => {
    const file = buildEpub({
      chapters: [
        { id: "ch1", title: "Le départ", html: "<h1>Le départ</h1><p>Il était une fois un long voyage.</p>" },
        { id: "ch2", title: "Le retour", html: "<p>Et le voyageur revint enfin chez lui.</p>" },
      ],
    });

    const result = await parseEpub(file);

    expect(result.title).toBe("Le Livre");
    expect(result.author).toBe("Jeanne Auteure");
    expect(result.content).toBe(
      "## Le départ\n\nIl était une fois un long voyage.\n\n## Le retour\n\nEt le voyageur revint enfin chez lui.",
    );
  });

  it("supprime le titre répété en tête du chapitre", async () => {
    const file = buildEpub({
      chapters: [{ id: "ch1", title: "Prologue", html: "<h1>Prologue</h1><p>Le texte commence vraiment ici.</p>" }],
    });
    const { content } = await parseEpub(file);
    expect(content).not.toMatch(/Prologue\n\nPrologue/);
    expect(content.startsWith("## Prologue\n\nLe texte commence")).toBe(true);
  });

  it("ignore les chapitres quasi vides (page de garde)", async () => {
    const file = buildEpub({
      chapters: [
        { id: "garde", title: "Garde", html: "<p>Titre</p>" },
        { id: "ch1", title: "Un", html: "<p>Un chapitre avec assez de texte pour compter.</p>" },
      ],
    });
    const { content } = await parseEpub(file);
    expect(content).not.toContain("## Garde");
    expect(content).toContain("## Un");
  });

  it("conserve l'italique du texte source", async () => {
    const file = buildEpub({
      chapters: [{ id: "ch1", title: "Lecture", html: "<p>Elle relisait <em>Madame Bovary</em> chaque été.</p>" }],
    });
    const { content } = await parseEpub(file);
    expect(content).toContain("Elle relisait *Madame Bovary* chaque été.");
  });

  it("extrait la couverture déclarée dans les métadonnées", async () => {
    const file = buildEpub({
      withCover: true,
      chapters: [{ id: "ch1", title: "Un", html: "<p>Un chapitre avec assez de texte pour compter.</p>" }],
    });
    const { coverBuffer } = await parseEpub(file);
    expect(coverBuffer?.subarray(0, 4).toString("hex")).toBe("89504e47"); // signature PNG
  });

  it("n'a pas de couverture quand l'EPUB n'en déclare pas", async () => {
    const file = buildEpub({
      chapters: [{ id: "ch1", title: "Un", html: "<p>Un chapitre avec assez de texte pour compter.</p>" }],
    });
    expect((await parseEpub(file)).coverBuffer).toBeUndefined();
  });

  it("rejette un fichier qui n'est pas un EPUB", async () => {
    const file = new File(["pas un zip"], "faux.epub");
    await expect(parseEpub(file)).rejects.toThrow();
  });
});
