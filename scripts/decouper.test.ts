import { describe, expect, it } from "vitest";
import { MOTS_MAX, MOTS_MIN, decouper } from "./decouper";

const EN_TETE =
  "Cahier de doléances et de propositions\nCommune de Exemple (00)\nOuvert le 1er janvier 2019";

function phrase(mots: number, mot: string): string {
  return `${Array.from({ length: mots }, () => mot).join(" ")}.`;
}

function transcription(...contributions: string[]): string {
  return `${[EN_TETE, ...contributions].join("\n\n")}\n`;
}

function compterMots(texte: string): number {
  return texte.split(/\s+/).filter(Boolean).length;
}

describe("decouper", () => {
  it("exclut l'en-tête", () => {
    const chunks = decouper(transcription(phrase(150, "a")));
    expect(chunks).toEqual([phrase(150, "a")]);
    expect(chunks.join(" ")).not.toContain("doléances");
  });

  it("regroupe les contributions sans dépasser MOTS_MAX", () => {
    const contributions = [
      phrase(150, "a"),
      phrase(150, "b"),
      phrase(150, "c"),
      phrase(150, "d"),
    ];
    const chunks = decouper(transcription(...contributions));
    expect(chunks).toEqual([
      `${contributions[0]}\n\n${contributions[1]}`,
      `${contributions[2]}\n\n${contributions[3]}`,
    ]);
  });

  it("coupe une contribution trop longue entre deux phrases", () => {
    const phrases = Array.from({ length: 9 }, (_, i) => phrase(99, `m${i}`));
    const chunks = decouper(transcription(phrases.join(" ")));
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(compterMots(chunk)).toBeLessThanOrEqual(MOTS_MAX);
      expect(chunk).toMatch(/\.$/);
    }
    expect(chunks.join(" ")).toBe(phrases.join(" "));
  });

  it("ne laisse pas un petit dernier groupe quand une autre coupure respecte les bornes", () => {
    const chunks = decouper(
      transcription(
        phrase(150, "a"),
        phrase(150, "b"),
        phrase(90, "c"),
        phrase(30, "d"),
      ),
    );
    expect(chunks.map(compterMots)).toEqual([150, 270]);
    for (const chunk of chunks) {
      expect(compterMots(chunk)).toBeGreaterThanOrEqual(MOTS_MIN);
      expect(compterMots(chunk)).toBeLessThanOrEqual(MOTS_MAX);
    }
  });
});
