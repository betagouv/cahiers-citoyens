import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { beforeAll, describe, expect, it } from "vitest";
import { registerFonts } from "./hands";
import {
  correctMunicipality,
  correctText,
  stampCorrection,
} from "./notebook-change";

beforeAll(() => registerFonts(join(import.meta.dirname, "fonts")));

describe("correctText", () => {
  it("garde le texte et y ajoute une mention de relecture", () => {
    expect(correctText("Texte")).toBe("Texte [relu et corrigé]");
  });
});

describe("correctMunicipality", () => {
  it("corrige le nom de la commune", () => {
    expect(correctMunicipality("Gap")).toBe("Gap (commune nouvelle)");
  });
});

describe("stampCorrection", () => {
  it("appose un tampon rouge en haut à droite, et seulement là", () => {
    const canvas = createCanvas(1240, 1754);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 1240, 1754);
    const before = Buffer.from(canvas.data());
    stampCorrection(canvas);
    const [r, g] = ctx.getImageData(1240 - 330, 60, 1, 1).data;
    expect(r).toBeGreaterThan(g + 50);
    expect(Buffer.from(canvas.data()).equals(before)).toBe(false);
    const bottom = ctx.getImageData(0, 200, 1240, 1554).data;
    expect(bottom.every((value) => value === 255)).toBe(true);
  });
});
