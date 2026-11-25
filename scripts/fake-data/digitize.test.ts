import { createCanvas } from "@napi-rs/canvas";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrain, digitize } from "./digitize";
import { HEIGHT, WIDTH } from "./page-geometry";
import { createRandom } from "./random";

afterEach(() => {
  vi.doUnmock("@napi-rs/canvas");
  vi.resetModules();
});

describe("createGrain", () => {
  it("produit une tuile de 256 px, presque transparente", () => {
    const grain = createGrain(createRandom("grain"));
    expect([grain.width, grain.height]).toEqual([256, 256]);
    const alphas = grain
      .getContext("2d")
      .getImageData(0, 0, 256, 256)
      .data.filter((_, i) => i % 4 === 3);
    expect(Math.max(...alphas)).toBeLessThanOrEqual(6);
  });
});

describe("digitize", () => {
  it("rend une page A4 au même format, posée sur le fond gris du scanner", async () => {
    const random = createRandom("scan");
    const paper = createCanvas(WIDTH, HEIGHT);
    const scan = digitize(paper, createGrain(random), random);
    expect([scan.width, scan.height]).toEqual([WIDTH, HEIGHT]);
    const png = await scan.encode("png");
    expect(png.subarray(1, 4).toString()).toBe("PNG");
  });

  it("échoue si le motif de grain ne peut pas être créé", async () => {
    vi.doMock("@napi-rs/canvas", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@napi-rs/canvas")>();
      return {
        ...actual,
        createCanvas(width: number, height: number) {
          const canvas = actual.createCanvas(width, height);
          canvas.getContext("2d").createPattern = () => null;
          return canvas;
        },
      };
    });
    const mocked = await import("./digitize");
    const random = createRandom("sans-motif");
    expect(() =>
      mocked.digitize(createCanvas(WIDTH, HEIGHT), createGrain(random), random),
    ).toThrow("motif de grain impossible à créer");
  });
});
