import { describe, expect, it } from "vitest";
import { excerpt, formatNumber } from "./format";

describe("formatNumber", () => {
  it("sépare les milliers à la française", () => {
    expect(formatNumber(12345)).toBe("12 345");
  });
});

describe("excerpt", () => {
  it("garde un texte court tel quel, espaces normalisés", () => {
    expect(excerpt("  Un   texte\ncourt. ", 50)).toBe("Un texte court.");
  });

  it("coupe à la fin d'un mot et ajoute une ellipse", () => {
    expect(excerpt("Les urgences sont saturées, on attend.", 27)).toBe(
      "Les urgences sont saturées…",
    );
  });

  it("coupe au milieu d'un mot unique trop long", () => {
    expect(excerpt("Anticonstitutionnellement", 6)).toBe("Antico…");
  });
});
