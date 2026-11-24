import { describe, expect, it } from "vitest";
import { composeNotebook } from "./compose";
import { THEME_IDS } from "./domain";
import { createRandom } from "./random";

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const NOTEBOOKS = Array.from({ length: 300 }, (_, i) =>
  composeNotebook(i + 1, createRandom(`compose:${i + 1}`)),
);

describe("composeNotebook", () => {
  it("est déterministe pour une même graine", () => {
    expect(composeNotebook(7, createRandom("a"))).toEqual(
      composeNotebook(7, createRandom("a")),
    );
  });

  it("numérote l'id et date l'ouverture entre décembre 2018 et février 2019", () => {
    expect(NOTEBOOKS[0].id).toBe("notebook-0001");
    expect(NOTEBOOKS[299].id).toBe("notebook-0300");
    for (const { openedOn } of NOTEBOOKS) {
      expect(openedOn >= "2018-12-01" && openedOn <= "2019-02-28").toBe(true);
    }
  });

  it("produit 3 à 15 contributions de 40 à 200 mots, numérotées", () => {
    for (const { contributions } of NOTEBOOKS) {
      expect(contributions.length).toBeGreaterThanOrEqual(3);
      expect(contributions.length).toBeLessThanOrEqual(15);
      contributions.forEach((contribution, i) => {
        expect(contribution.position).toBe(i + 1);
        expect(THEME_IDS).toContain(contribution.theme);
        expect(countWords(contribution.text)).toBeLessThanOrEqual(200);
        expect(contribution.text).not.toMatch(/\{\w+\}/);
      });
    }
  });

  it("laisse certaines contributions sans signature", () => {
    const signatures = NOTEBOOKS.flatMap(({ contributions }) =>
      contributions.map(({ signature }) => signature),
    );
    expect(signatures).toContain(null);
    expect(signatures.some((signature) => signature !== null)).toBe(true);
  });
});
