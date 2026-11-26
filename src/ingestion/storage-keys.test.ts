import { describe, expect, it } from "vitest";
import { IMAGE_CONTENT_TYPE, pageImageKey } from "./storage-keys";

describe("pageImageKey", () => {
  it("range l'image sous le cahier et la version, avec l'extension du type lu", () => {
    expect(pageImageKey("CC_01", 2, 7, "jpeg")).toBe(
      "notebooks/CC_01/v2/7.jpg",
    );
    expect(pageImageKey("CC_01", 1, 12, "png")).toBe(
      "notebooks/CC_01/v1/12.png",
    );
  });
});

describe("IMAGE_CONTENT_TYPE", () => {
  it("donne le type MIME de chaque format", () => {
    expect(IMAGE_CONTENT_TYPE).toEqual({
      jpeg: "image/jpeg",
      png: "image/png",
    });
  });
});
