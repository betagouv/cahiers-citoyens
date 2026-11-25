import { describe, expect, it } from "vitest";
import { DEFECTS, isDefect } from "./defects";

describe("isDefect", () => {
  it("reconnaît chaque défaut de la liste, et rien d'autre", () => {
    for (const defect of DEFECTS) expect(isDefect(defect)).toBe(true);
    expect(isDefect("missing-page")).toBe(false);
    expect(isDefect("")).toBe(false);
  });
});
