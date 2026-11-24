import { describe, expect, it } from "vitest";
import { errorMessage } from "./error-message";

describe("errorMessage", () => {
  it("renvoie le message d'une erreur", () => {
    expect(errorMessage(new Error("échec"))).toBe("échec");
  });

  it("déroule la chaîne des causes", () => {
    const root = new Error("connect ECONNREFUSED");
    const wrapped = new Error("Failed query: select 1", {
      cause: new Error("socket", { cause: root }),
    });
    expect(errorMessage(wrapped)).toBe(
      "Failed query: select 1 : socket : connect ECONNREFUSED",
    );
  });

  it("convertit en texte une valeur levée qui n'est pas une erreur", () => {
    expect(errorMessage("refus")).toBe("refus");
    expect(errorMessage(42)).toBe("42");
  });
});
