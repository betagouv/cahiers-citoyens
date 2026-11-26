import { describe, expect, it } from "vitest";
import { toSearchName } from "@/geography/search-name";
import { foldAccents } from "./fold-accents";
import { HIGHLIGHT_END, HIGHLIGHT_START } from "./highlight-markers";
import { matchedPrefixLength, splitHighlights } from "./highlight";

describe("matchedPrefixLength", () => {
  it("mesure la part du nom couverte par la saisie normalisée", () => {
    expect(matchedPrefixLength("Charolles", "char", toSearchName)).toBe(4);
    expect(matchedPrefixLength("Saint-Étienne", "saint e", toSearchName)).toBe(
      7,
    );
    expect(matchedPrefixLength("rétrocession", "RETR", foldAccents)).toBe(4);
    expect(matchedPrefixLength("œuvre", "oe", foldAccents)).toBe(1);
  });

  it("vaut 0 si le texte ne commence pas par la saisie", () => {
    expect(matchedPrefixLength("Charolles", "71", toSearchName)).toBe(0);
    expect(matchedPrefixLength("Charolles", " ", toSearchName)).toBe(0);
  });
});

describe("splitHighlights", () => {
  it("isole les mots trouvés", () => {
    expect(
      splitHighlights(
        `La ${HIGHLIGHT_START}retraite${HIGHLIGHT_END} à 60 ans, ${HIGHLIGHT_START}retraite${HIGHLIGHT_END}`,
      ),
    ).toEqual([
      { text: "La ", highlighted: false },
      { text: "retraite", highlighted: true },
      { text: " à 60 ans, ", highlighted: false },
      { text: "retraite", highlighted: true },
    ]);
  });

  it("garde tel quel un texte sans borne ou à borne orpheline", () => {
    expect(splitHighlights("Sans mot trouvé")).toEqual([
      { text: "Sans mot trouvé", highlighted: false },
    ]);
    expect(splitHighlights(`a ${HIGHLIGHT_START}b`)).toEqual([
      { text: "a ", highlighted: false },
      { text: "b", highlighted: false },
    ]);
  });
});
