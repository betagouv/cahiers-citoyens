import { describe, expect, it } from "vitest";
import { INGEST_ERROR_CODES } from "./errors";

describe("INGEST_ERROR_CODES", () => {
  it("ne contient que des codes kebab-case distincts", () => {
    expect(new Set(INGEST_ERROR_CODES).size).toBe(INGEST_ERROR_CODES.length);
    for (const code of INGEST_ERROR_CODES) {
      expect(code).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
  });
});
