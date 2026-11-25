import { expect, it } from "vitest";
import { submitLabel } from "./submit-label";

it.each([
  [{ status: "unknown" } as const, "Rechercher"],
  [{ status: "loading" } as const, "Voir les pages"],
  [{ status: "known", pageCount: 0 } as const, "Rechercher"],
  [{ status: "known", pageCount: 1 } as const, "Voir la page"],
  [{ status: "known", pageCount: 7 } as const, "Voir les 7 pages"],
  [{ status: "known", pageCount: 1896 } as const, "Voir les 1 896 pages"],
])("%j donne « %s »", (state, label) => {
  expect(submitLabel(state)).toBe(label);
});
