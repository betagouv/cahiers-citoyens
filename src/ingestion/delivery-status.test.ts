import { describe, expect, it } from "vitest";
import {
  DELIVERY_STATUSES,
  assertTransition,
  canTransition,
} from "./delivery-status";

function allowedPairs(): string[] {
  return DELIVERY_STATUSES.flatMap((from) =>
    DELIVERY_STATUSES.filter((to) => canTransition(from, to)).map(
      (to) => `${from} → ${to}`,
    ),
  );
}

describe("canTransition", () => {
  it("n'autorise que le chemin de la machine à états et la relance d'un échec", () => {
    expect(allowedPairs()).toEqual([
      "received → verifying",
      "received → failed",
      "verifying → applying",
      "verifying → rejected",
      "verifying → failed",
      "applying → applied",
      "applying → failed",
      "failed → verifying",
    ]);
  });
});

describe("assertTransition", () => {
  it("laisse passer une transition autorisée", () => {
    expect(() => assertTransition("verifying", "rejected")).not.toThrow();
  });

  it("refuse de sortir d'un statut terminal", () => {
    expect(() => assertTransition("applied", "failed")).toThrow(
      "Transition de dépôt interdite : applied → failed",
    );
  });
});
