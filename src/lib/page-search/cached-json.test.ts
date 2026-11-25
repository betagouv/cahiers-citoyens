import { describe, expect, it } from "vitest";
import {
  MAX_QUERY_LENGTH,
  SEARCH_CACHE_CONTROL,
  badRequest,
  cachedJson,
  queryParam,
} from "./cached-json";

describe("cachedJson", () => {
  it("répond en JSON, cacheable quelques minutes", async () => {
    const response = cachedJson({ pageCount: 7 });

    expect(response.headers.get("cache-control")).toBe(SEARCH_CACHE_CONTROL);
    await expect(response.json()).resolves.toEqual({ pageCount: 7 });
  });
});

describe("badRequest", () => {
  it("répond 400 sans cache", async () => {
    const response = badRequest("Lieu invalide");

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBeNull();
    await expect(response.json()).resolves.toEqual({ error: "Lieu invalide" });
  });
});

describe("queryParam", () => {
  it("lit et borne un paramètre", () => {
    const request = new Request(
      `http://localhost/api?q=${"a".repeat(150)}&place=71`,
    );

    expect(queryParam(request, "q")).toHaveLength(MAX_QUERY_LENGTH);
    expect(queryParam(request, "place")).toBe("71");
    expect(queryParam(request, "absent")).toBe("");
  });
});
