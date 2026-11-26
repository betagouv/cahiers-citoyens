import { describe, expect, it } from "vitest";
import type { OnlineDepartment } from "./departments";
import { onlineSummary } from "./online-summary";

function online(code: string, notebookCount = 1): OnlineDepartment {
  return { code, name: `Département ${code}`, notebookCount };
}

const INVITATION = "Sélectionnez un département pour lire ses cahiers.";

describe("onlineSummary", () => {
  it("annonce qu'aucun cahier n'est encore consultable", () => {
    expect(onlineSummary([])).toBe(
      "Aucun cahier n'est encore consultable. Les cahiers sont mis en ligne progressivement, département par département.",
    );
  });

  it("nomme un seul département et un seul cahier au singulier", () => {
    expect(onlineSummary([online("04")])).toBe(
      `1 cahier est consultable aujourd'hui, dans un département. ${INVITATION}`,
    );
  });

  it("compte les cahiers et les départements de métropole", () => {
    expect(onlineSummary([online("04", 2), online("25", 3)])).toBe(
      `5 cahiers sont consultables aujourd'hui, dans 2 départements. ${INVITATION}`,
    );
  });

  it("ajoute les outre-mer sans les compter parmi les départements", () => {
    expect(onlineSummary([online("04"), online("971"), online("974")])).toBe(
      `3 cahiers sont consultables aujourd'hui, dans un département et les outre-mer. ${INVITATION}`,
    );
  });

  it("ne cite que les outre-mer quand la métropole n'a rien", () => {
    expect(onlineSummary([online("972")])).toBe(
      `1 cahier est consultable aujourd'hui, dans les outre-mer. ${INVITATION}`,
    );
  });
});
