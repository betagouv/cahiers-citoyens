import { describe, expect, it } from "vitest";
import { composeText, MAX_WORDS, TYPOS } from "./compose-text";
import type { FragmentBank, Municipality } from "./domain";
import { createRandom } from "./random";

const NONTRON: Municipality = {
  name: "Nontron",
  inseeCode: "24311",
  department: "Dordogne",
  region: "Nouvelle-Aquitaine",
};

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

describe("composeText", () => {
  it("s'arrête quand les piles de fragments sont vides", () => {
    const bank: FragmentBank = {
      openings: ["Bonjour."],
      findings: ["Constat à {municipality}."],
      examples: ["Exemple."],
      demands: ["Demande."],
      conclusions: ["Merci."],
    };
    for (let i = 0; i < 20; i++) {
      const text = composeText(bank, NONTRON, createRandom(`petit:${i}`));
      expect(text).toMatch(/Constat (à|a) Nontron\./);
      expect(text.split("Demande.").length).toBe(2);
      expect(countWords(text)).toBeLessThanOrEqual(7);
    }
  });

  it("écarte un fragment qui ferait dépasser MAX_WORDS", () => {
    const long = Array.from({ length: MAX_WORDS }, () => "mot").join(" ");
    const bank: FragmentBank = {
      openings: [long],
      findings: [long, "Court."],
      examples: [long],
      demands: [long],
      conclusions: [long],
    };
    for (let i = 0; i < 20; i++) {
      const text = composeText(bank, NONTRON, createRandom(`long:${i}`));
      expect(countWords(text)).toBeLessThanOrEqual(MAX_WORDS);
    }
  });
});

describe("TYPOS", () => {
  it("ne touche que des mots entiers, accentués compris", () => {
    const samples: Record<string, string> = {
      a: "aller à la mairie",
      ca: "ça suffit",
      deja: "il est déjà parti",
      tres: "très cher",
      meme: "la même chose",
      leur: "leurs enfants",
      etre: "doit être fait",
      probleme: "un problème réel",
      "nous somme": "nous sommes là",
    };
    for (const [pattern, typo] of TYPOS) {
      const sample = samples[typo];
      expect(sample.replace(pattern, typo)).not.toBe(sample);
    }
    const [accent] = TYPOS;
    expect("voilà là".replace(accent[0], accent[1])).toBe("voilà là");
  });
});
