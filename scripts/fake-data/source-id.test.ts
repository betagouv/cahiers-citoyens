import { describe, expect, it } from "vitest";
import { sourceId } from "./source-id";
import { shortNotebook } from "./test-notebook";

describe("sourceId", () => {
  it("suit la forme des noms de l'inventaire", () => {
    expect(sourceId(shortNotebook(), 12, "42")).toMatch(
      /^CC_76351_190101_00012_MD_\d{5}$/,
    );
  });

  it("dépend de la graine et reste stable pour une même graine", () => {
    const notebook = shortNotebook();
    expect(sourceId(notebook, 1, "42")).toBe(sourceId(notebook, 1, "42"));
    const batches = new Set(
      ["1", "2", "3", "4", "5"].map((seed) => sourceId(notebook, 1, seed)),
    );
    expect(batches.size).toBeGreaterThan(1);
  });
});
