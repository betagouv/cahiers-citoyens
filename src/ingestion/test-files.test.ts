import { describe, expect, it } from "vitest";
import { fakeSha256, notebookIdOf } from "./test-files";

describe("aides de test", () => {
  it("refusent un identifiant ou une graine invalides", () => {
    expect(() => notebookIdOf("é")).toThrow(/Nom de fichier invalide/);
    expect(() => fakeSha256(-1)).toThrow("SHA-256 invalide");
  });
});
