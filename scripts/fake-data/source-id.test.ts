import { describe, expect, it } from "vitest";
import { sourceId } from "./source-id";
import { shortNotebook } from "./test-notebook";

describe("sourceId", () => {
  it("suit la forme des identifiants Condorcet", () => {
    expect(sourceId(shortNotebook(), "76600", 12)).toBe(
      "CC_76600_190101_76351_MD_10012",
    );
  });

  it("distingue deux cahiers de la même commune ouverts le même jour", () => {
    expect(sourceId(shortNotebook(), "76600", 1)).not.toBe(
      sourceId(shortNotebook(), "76600", 2),
    );
  });
});
