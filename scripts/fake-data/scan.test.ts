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

function allText(pages: ScanPage[]): string {
  return pages.flatMap(({ lines }) => lines.map(({ text }) => text)).join(" ");
}

async function collect(pages: AsyncIterable<ScanPage>): Promise<ScanPage[]> {
  const all: ScanPage[] = [];
  for await (const page of pages) all.push(page);
  return all;
}

beforeAll(() => registerFonts(join(import.meta.dirname, "fonts")));

describe("renderPages", () => {
  const notebook = composeNotebook(3, createRandom("scan:3"));

  it("rend chaque page en A4 avec les lignes qui y sont écrites", async () => {
    const pages = await collect(renderPages(notebook, "s"));
    expect(pages.length).toBeGreaterThan(1);
    for (const { canvas, lines } of pages) {
      expect([canvas.width, canvas.height]).toEqual([WIDTH, HEIGHT]);
      expect(lines.length).toBeGreaterThan(0);
    }
    expect(words(allText(pages))).toEqual(words(formatTranscription(notebook)));
  });

  it("place chaque ligne dans la page, de haut en bas", async () => {
    const [first] = await collect(renderPages(notebook, "s"));
    const tops = first.lines.map(({ polygon }) => polygon[0][0][1]);
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    for (const { polygon } of first.lines) {
      const [ring] = polygon;
      expect(ring).toHaveLength(5);
      expect(ring[4]).toEqual(ring[0]);
      for (const [x, y] of ring) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(WIDTH);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(HEIGHT);
      }
    }
    expect(first.lines[0]).toMatchObject({
      text: "Cahier de doléances et de propositions",
      role: "header",
    });
  });

  it("insère des pages blanches sans texte quand on le demande", async () => {
    const pages = await collect(
      renderPages(notebook, "s", createRandom("blancs:1")),
    );
    const counts = pages.map(({ lines }) => lines.length);
    expect(counts).toContain(0);
    expect(counts[0]).toBeGreaterThan(0);
    expect(words(allText(pages))).toEqual(words(formatTranscription(notebook)));
  });

  it("dessine les mêmes pixels pour la même graine", async () => {
    const [a] = await collect(renderPages(notebook, "s"));
    const [b] = await collect(renderPages(notebook, "s"));
    const [c] = await collect(renderPages(notebook, "autre"));
    expect(a.canvas.data().equals(b.canvas.data())).toBe(true);
    expect(a.canvas.data().equals(c.canvas.data())).toBe(false);
  });
});
