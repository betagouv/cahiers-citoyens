import { describe, expect, it } from "vitest";
import { runError } from "./run-error";

describe("runError", () => {
  it("rattache le message d'une erreur à son dépôt ou à son étape", () => {
    expect(runError("embed", new Error("Albert injoignable"))).toEqual({
      scope: "embed",
      message: "Albert injoignable",
    });
    expect(runError("run", "texte")).toEqual({
      scope: "run",
      message: "texte",
    });
  });
});
