import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { composeNotebook } from "./compose";
import { registerFonts } from "./hands";
import { HEIGHT, WIDTH } from "./page-geometry";
import { createRandom } from "./random";
import { renderPages, type ScanPage } from "./scan";
import { formatTranscription } from "./transcription";

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

async function collect(pages: AsyncIterable<ScanPage>): Promise<ScanPage[]> {
  const all: ScanPage[] = [];
  for await (const page of pages) all.push(page);
  return all;
}

beforeAll(() => registerFonts(join(import.meta.dirname, "fonts")));

describe("renderPages", () => {
  const notebook = composeNotebook(3, createRandom("scan:3"));

  it("rend chaque page en A4 avec le texte qui y est écrit", async () => {
    const pages = await collect(renderPages(notebook, "s"));
    expect(pages.length).toBeGreaterThan(1);
    for (const { canvas, text } of pages) {
      expect([canvas.width, canvas.height]).toEqual([WIDTH, HEIGHT]);
      expect(text).not.toBe("");
    }
    expect(words(pages.map(({ text }) => text).join(" "))).toEqual(
      words(formatTranscription(notebook)),
    );
  });

  it("insère des pages blanches sans texte quand on le demande", async () => {
    const pages = await collect(
      renderPages(notebook, "s", createRandom("blancs:1")),
    );
    const texts = pages.map(({ text }) => text);
    expect(texts).toContain("");
    expect(texts[0]).not.toBe("");
    expect(words(texts.join(" "))).toEqual(
      words(formatTranscription(notebook)),
    );
  });

  it("dessine les mêmes pixels pour la même graine", async () => {
    const [a] = await collect(renderPages(notebook, "s"));
    const [b] = await collect(renderPages(notebook, "s"));
    const [c] = await collect(renderPages(notebook, "autre"));
    expect(a.canvas.data().equals(b.canvas.data())).toBe(true);
    expect(a.canvas.data().equals(c.canvas.data())).toBe(false);
  });
});
