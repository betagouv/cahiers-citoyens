import { describe, expect, it } from "vitest";
import {
  PAGE_IMAGE_CACHE_CONTROL,
  pageImageError,
  pageImageResponse,
} from "./page-image-response";

describe("pageImageResponse", () => {
  it("sert l'image avec son type, sa taille et un cache long", async () => {
    const response = pageImageResponse("image/png", {
      body: new Response("png").body ?? new ReadableStream(),
      contentLength: 3,
      etag: '"etag"',
    });

    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toEqual({
      "content-type": "image/png",
      "content-length": "3",
      etag: '"etag"',
      "cache-control": PAGE_IMAGE_CACHE_CONTROL,
      "x-content-type-options": "nosniff",
    });
    expect(await response.text()).toBe("png");
  });

  it("omet la taille et l'ETag inconnus", () => {
    const response = pageImageResponse("image/jpeg", {
      body: new ReadableStream(),
      contentLength: undefined,
      etag: undefined,
    });

    expect(response.headers.has("content-length")).toBe(false);
    expect(response.headers.has("etag")).toBe(false);
  });
});

describe("pageImageError", () => {
  it("répond une erreur jamais gardée en cache", async () => {
    const response = pageImageError("Image introuvable", 404);

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("Image introuvable");
  });
});
