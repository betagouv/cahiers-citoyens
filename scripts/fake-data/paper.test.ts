import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { HEIGHT, LEFT_MARGIN, WIDTH } from "./page-geometry";
import { drawPaper, type Ruling } from "./paper";
import { createRandom } from "./random";

function paper(ruling: Ruling): Uint8ClampedArray {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  drawPaper(ctx, ruling, [245, 240, 220], createRandom("papier"));
  return ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
}

function pixel(data: Uint8ClampedArray, x: number, y: number): number[] {
  const i = (y * WIDTH + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

describe("drawPaper", () => {
  it("trace la marge rouge, quelle que soit la réglure", () => {
    for (const ruling of ["seyes", "plain"] as const) {
      const [r, g, b] = pixel(paper(ruling), LEFT_MARGIN, HEIGHT / 2);
      expect(r).toBeGreaterThan(g + 50);
      expect(r).toBeGreaterThan(b + 50);
    }
  });

  it("ajoute les verticales du Seyès que le papier uni n'a pas", () => {
    const seyes = paper("seyes");
    const plain = paper("plain");
    const differing = Array.from({ length: 200 }, (_, x) => x + LEFT_MARGIN + 5)
      .map((x) => pixel(seyes, x, 7).join() !== pixel(plain, x, 7).join())
      .filter(Boolean).length;
    expect(differing).toBeGreaterThan(0);
  });
});
