import { describe, expect, it } from "vitest";
import { isPng, pngSize } from "./png-header";
import { pngBytes } from "./test-images";

describe("pngSize", () => {
  it("lit la largeur et la hauteur dans IHDR", () => {
    expect(pngSize(pngBytes(2484, 3507))).toEqual({
      width: 2484,
      height: 3507,
    });
  });

  it("lit un PNG au milieu d'un tampon plus grand", () => {
    const bytes = new Uint8Array(40);
    bytes.set(pngBytes(7, 9), 5);
    expect(pngSize(bytes.subarray(5))).toEqual({ width: 7, height: 9 });
  });

  it("refuse un en-tête tronqué, un premier bloc autre ou une taille nulle", () => {
    expect(pngSize(pngBytes(10, 10).subarray(0, 23))).toBeNull();
    const other = pngBytes(10, 10);
    other[12] = 0x69;
    expect(pngSize(other)).toBeNull();
    expect(pngSize(pngBytes(0, 10))).toBeNull();
    expect(pngSize(pngBytes(10, 0))).toBeNull();
  });

  it("reconnaît la signature seule", () => {
    expect(isPng(pngBytes(1, 1).subarray(0, 8))).toBe(true);
    expect(isPng(new Uint8Array([0x89, 0x50]))).toBe(false);
    expect(pngSize(new TextEncoder().encode("pas une image"))).toBeNull();
  });
});
