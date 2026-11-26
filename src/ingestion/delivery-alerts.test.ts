import { describe, expect, it } from "vitest";
import { failedAlert, rejectedAlert } from "./delivery-alerts";

const NAME = "delivery-2026-11-24-0930.zip";

describe("rejectedAlert", () => {
  it("résume les erreurs par code", () => {
    const errors = [
      { code: "missing-image" as const, message: "a" },
      { code: "duplicate-page" as const, message: "b" },
      { code: "missing-image" as const, message: "c" },
    ];

    expect(rejectedAlert(NAME, errors)).toEqual({
      event: "delivery.rejected",
      text: `Dépôt ${NAME} refusé : 3 erreur(s) (duplicate-page, missing-image).`,
      details: {
        delivery: NAME,
        errors: 3,
        codes: "duplicate-page, missing-image",
      },
    });
  });
});

describe("failedAlert", () => {
  it("donne le dernier message d'échec", () => {
    expect(failedAlert(NAME, 3, "base injoignable")).toEqual({
      event: "delivery.failed",
      text: `Dépôt ${NAME} abandonné après 3 tentatives : base injoignable`,
      details: { delivery: NAME, attempts: 3, failure: "base injoignable" },
    });
  });

  it("signale une cause inconnue", () => {
    expect(failedAlert(NAME, 3, null).details.failure).toBe("cause inconnue");
  });
});
