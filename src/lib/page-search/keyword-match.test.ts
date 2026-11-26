import { describe, expect, it } from "vitest";
import { containsAnyWord, keywordWords, splitKeyword } from "./keyword-match";

describe("keywordWords", () => {
  it("garde chaque mot en minuscules, avec ses accents", () => {
    expect([...keywordWords("Impôt  RETRAITE")]).toEqual(["impôt", "retraite"]);
  });

  it("coupe aux apostrophes et aux tirets, comme Postgres", () => {
    expect([...keywordWords("l'impôt peut-être")]).toEqual([
      "l",
      "impôt",
      "peut",
      "être",
    ]);
  });

  it("ne trouve aucun mot dans une ponctuation", () => {
    expect(keywordWords(" … ").size).toBe(0);
  });
});

describe("splitKeyword", () => {
  it("surligne chaque occurrence du mot entier, quelle que soit la casse", () => {
    expect(
      splitKeyword(
        "Impôt juste, l'impôt et les impôts.",
        keywordWords("impôt"),
      ),
    ).toEqual([
      { text: "Impôt", highlighted: true },
      { text: " juste, l'", highlighted: false },
      { text: "impôt", highlighted: true },
      { text: " et les impôts.", highlighted: false },
    ]);
  });

  it("ne replie pas les accents, comme la recherche en base", () => {
    expect(splitKeyword("l'impôt", keywordWords("impot"))).toEqual([
      { text: "l'impôt", highlighted: false },
    ]);
  });

  it("surligne chacun des mots du mot-clé", () => {
    expect(
      splitKeyword("retraite et impôt", keywordWords("impôt retraite")),
    ).toEqual([
      { text: "retraite", highlighted: true },
      { text: " et ", highlighted: false },
      { text: "impôt", highlighted: true },
    ]);
  });

  it("rend le texte entier sans mot-clé, et rien pour un texte vide", () => {
    expect(splitKeyword("Bonjour", new Set())).toEqual([
      { text: "Bonjour", highlighted: false },
    ]);
    expect(splitKeyword("", new Set())).toEqual([]);
    expect(splitKeyword("", keywordWords("impôt"))).toEqual([]);
  });
});

describe("containsAnyWord", () => {
  it("dit si le texte contient l'un des mots", () => {
    const words = keywordWords("impôt");
    expect(containsAnyWord("Un impôt.", words)).toBe(true);
    expect(containsAnyWord("Des impôts.", words)).toBe(false);
  });
});
