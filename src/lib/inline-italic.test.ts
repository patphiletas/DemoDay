import { describe, expect, it } from "vitest";
import { splitItalic } from "./inline-italic";

describe("splitItalic", () => {
  it("découpe texte normal et italique", () => {
    expect(splitItalic("Il lut *Candide* hier.")).toEqual([
      { text: "Il lut ", italic: false },
      { text: "Candide", italic: true },
      { text: " hier.", italic: false },
    ]);
  });

  it("laisse un astérisque isolé tel quel", () => {
    expect(splitItalic("Note* en bas")).toEqual([{ text: "Note* en bas", italic: false }]);
  });

  it("ne traverse pas un saut de ligne", () => {
    expect(splitItalic("*début\nfin*")).toEqual([{ text: "*début\nfin*", italic: false }]);
  });

  it("gère plusieurs italiques et un texte vide", () => {
    expect(splitItalic("*a* et *b*").filter((s) => s.italic).map((s) => s.text)).toEqual(["a", "b"]);
    expect(splitItalic("")).toEqual([]);
  });
});
