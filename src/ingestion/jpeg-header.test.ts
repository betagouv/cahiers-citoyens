import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { isJpeg, jpegSize } from "./jpeg-header";
import { jpegBytes, segment } from "./test-images";

describe("jpegSize", () => {
  it("lit un JPEG baseline produit par un encodeur", async () => {
    const bytes = await createCanvas(31, 17).encode("jpeg", 80);
    expect(jpegSize(bytes)).toEqual({ width: 31, height: 17 });
  });

  it("lit un JPEG progressif (SOF2) et les autres SOFn", () => {
    expect(jpegSize(jpegBytes(2484, 3507, 0xc2))).toEqual({
      width: 2484,
      height: 3507,
    });
    for (const sof of [0xc1, 0xc3, 0xc9, 0xcf]) {
      expect(jpegSize(jpegBytes(5, 6, sof))).toEqual({ width: 5, height: 6 });
    }
  });

  it("saute les segments APPn, DHT, les octets de remplissage et les RST", () => {
    const exif = segment(
      0xe1,
      Array.from({ length: 70_000 % 65_533 }, () => 0),
    );
    const before = [
      ...segment(0xe0, [0x4a, 0x46]),
      ...exif,
      ...segment(0xe2, [1, 2, 3]),
      ...segment(0xc4, [0, 0]),
      ...segment(0xc8, []),
      ...segment(0xcc, [0, 0]),
      0xff,
      0xff,
      0xff,
      0xd0,
      0xff,
      0x01,
    ];
    expect(jpegSize(jpegBytes(640, 480, 0xc0, before))).toEqual({
      width: 640,
      height: 480,
    });
  });

  it("refuse un en-tête tronqué", () => {
    const bytes = jpegBytes(640, 480);
    const sofAt = bytes.indexOf(0xc0, 2) - 1;
    expect(jpegSize(bytes.subarray(0, sofAt + 8))).toBeNull();
    expect(jpegSize(bytes.subarray(0, 10))).toBeNull();
    expect(jpegSize(bytes.subarray(0, 5))).toBeNull();
    expect(jpegSize(bytes.subarray(0, 2))).toBeNull();
  });

  it("refuse des données d'image avant tout SOF, ou une fin d'image", () => {
    expect(jpegSize(jpegBytes(1, 1, 0xc0, segment(0xda, [0])))).toBeNull();
    expect(jpegSize(jpegBytes(1, 1, 0xc0, [0xff, 0xd9]))).toBeNull();
    expect(jpegSize(jpegBytes(1, 1, 0xc0, [0xff, 0xd8]))).toBeNull();
  });

  it("refuse un octet hors marqueur, une longueur invalide, une taille nulle", () => {
    expect(jpegSize(jpegBytes(1, 1, 0xc0, [0x00]))).toBeNull();
    expect(
      jpegSize(jpegBytes(1, 1, 0xc0, [0xff, 0xe0, 0x00, 0x01])),
    ).toBeNull();
    expect(jpegSize(jpegBytes(0, 10))).toBeNull();
    expect(jpegSize(jpegBytes(10, 0))).toBeNull();
  });

  it("ne reconnaît que SOI en tête", () => {
    expect(isJpeg(new Uint8Array([0xff, 0xd8]))).toBe(true);
    expect(isJpeg(new Uint8Array([0xff, 0xd9]))).toBe(false);
    expect(jpegSize(new Uint8Array([0x89, 0x50]))).toBeNull();
  });
});
