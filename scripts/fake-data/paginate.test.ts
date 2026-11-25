import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { beforeAll, describe, expect, it } from "vitest";
import { composeNotebook } from "./compose";
import { newHand, registerFonts } from "./hands";
import { LINES_PER_PAGE } from "./page-geometry";
import { pageText } from "./page-layout";
import { paginate, wrapLines } from "./paginate";
import { createRandom } from "./random";
import { formatTranscription } from "./transcription";

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

beforeAll(() => registerFonts(join(import.meta.dirname, "fonts")));

describe("wrapLines", () => {
  const ctx = createCanvas(10, 10).getContext("2d");
  const hand = newHand(createRandom("w"), null);

  it("coupe un texte en lignes qui tiennent dans la largeur", () => {
    const lines = wrapLines(ctx, "un deux trois quatre cinq six", hand, 120);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.flat()).toEqual([
      "un",
      "deux",
      "trois",
      "quatre",
      "cinq",
      "six",
    ]);
  });

  it("ne produit aucune ligne pour un texte vide", () => {
    expect(wrapLines(ctx, "  ", hand, 120)).toEqual([]);
  });
});

describe("paginate", () => {
  const ctx = createCanvas(10, 10).getContext("2d");
  const notebooks = Array.from({ length: 5 }, (_, i) =>
    composeNotebook(i + 1, createRandom(`paginate:${i}`)),
  );

  it("remplit des pages d'au plus LINES_PER_PAGE lignes, finies par une ligne écrite", () => {
    for (const notebook of notebooks) {
      const pages = paginate(notebook, ctx, createRandom("p"));
      expect(pages.length).toBeGreaterThan(1);
      for (const page of pages) {
        expect(page.length).toBeLessThanOrEqual(LINES_PER_PAGE);
        expect(page[page.length - 1].kind).toBe("text");
      }
    }
  });

  it("répartit sur les pages tous les mots de la transcription, dans l'ordre", () => {
    for (const notebook of notebooks) {
      const pages = paginate(notebook, ctx, createRandom("p"));
      expect(words(pages.map(pageText).join(" "))).toEqual(
        words(formatTranscription(notebook)),
      );
    }
  });

  it("centre le titre et aligne les signatures à droite", () => {
    const [first] = paginate(notebooks[0], ctx, createRandom("p"));
    const aligns = first.flatMap((line) =>
      line.kind === "text" ? [line.align] : [],
    );
    expect(aligns[0]).toBe("center");
    expect(aligns).toContain("left");
  });
});
