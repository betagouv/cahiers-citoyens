import { describe, expect, it } from "vitest";
import { excerpt, formatDate } from "./format";

describe("formatDate", () => {
  it("écrit une date AAAA-MM-JJ en français, sans décalage de fuseau", () => {
    expect(formatDate("2019-02-08")).toBe("8 février 2019");
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
});
