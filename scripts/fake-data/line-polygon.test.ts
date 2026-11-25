import { describe, expect, it } from "vitest";
import { linePolygon } from "./line-polygon";
import { HEIGHT, WIDTH } from "./page-geometry";

describe("linePolygon", () => {
  it("encadre la ligne en anneau fermé, à l'échelle du scan", () => {
    expect(linePolygon(240, 900, 500)).toEqual([
      [
        [250, 475],
        [893, 475],
        [893, 521],
        [250, 521],
        [250, 475],
      ],
    ]);
  });

  it("reste dans la page", () => {
    expect(linePolygon(-100, WIDTH + 100, 5)).toEqual([
      [
        [0, 0],
        [1240, 0],
        [1240, 38],
        [0, 38],
        [0, 0],
      ],
    ]);
    expect(linePolygon(0, WIDTH, HEIGHT + 40)).toEqual([
      [
        [16, 1737],
        [1225, 1737],
        [1225, 1754],
        [16, 1754],
        [16, 1737],
      ],
    ]);
  });
});
