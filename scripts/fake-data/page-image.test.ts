import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { encodePage } from "./page-image";

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function magic(bytes: Uint8Array, length: number): number[] {
  return Array.from(bytes.subarray(0, length));
}

describe("encodePage", () => {
  const canvas = createCanvas(20, 30);

  it("encode en JPEG nommé .png, comme les dépôts réels", async () => {
    const image = await encodePage(canvas, "jpeg-named-png");
    expect(image.extension).toBe("png");
    expect(magic(image.bytes, 3)).toEqual(JPEG);
  });

  it("encode un vrai PNG", async () => {
    const image = await encodePage(canvas, "png");
    expect(image.extension).toBe("png");
    expect(magic(image.bytes, 8)).toEqual(PNG);
  });

  it("encode un JPEG nommé .jpg", async () => {
    const image = await encodePage(canvas, "jpg");
    expect(image.extension).toBe("jpg");
    expect(magic(image.bytes, 3)).toEqual(JPEG);
  });
});
