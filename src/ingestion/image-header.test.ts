import { describe, expect, it } from "vitest";
import { readImageHeader } from "./image-header";
import { jpegBytes, pngBytes } from "./test-images";

describe("readImageHeader", () => {
  it("reconnaît le type au contenu", () => {
    expect(readImageHeader(pngBytes(3, 4))).toEqual({
      type: "png",
      width: 3,
      height: 4,
    });
    expect(readImageHeader(jpegBytes(5, 6))).toEqual({
      type: "jpeg",
      width: 5,
      height: 6,
    });
  });

  it("refuse ce qui n'est ni un PNG ni un JPEG lisible", () => {
    expect(readImageHeader(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(readImageHeader(new Uint8Array())).toBeNull();
  });
});
