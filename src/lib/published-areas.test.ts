import { describe, expect, it } from "vitest";
import type { OnlineDepartment } from "./departments";
import { areaHref, areaHrefByCode, publishedAreas } from "./published-areas";

function online(code: string, name: string): OnlineDepartment {
  return { code, name, notebookCount: 1 };
}

const DEPARTMENTS = [
  online("972", "Martinique"),
  online("25", "Doubs"),
  online("971", "Guadeloupe"),
  online("04", "Alpes-de-Haute-Provence"),
  online("93", "Seine-Saint-Denis"),
];

describe("publishedAreas", () => {
  it("regroupe l'outre-mer et range les zones par nom", () => {
    expect(publishedAreas(DEPARTMENTS)).toEqual([
      { label: "Alpes-de-Haute-Provence", codes: ["04"] },
      { label: "Doubs", codes: ["25"] },
      { label: "Outre-mer", codes: ["971", "972"] },
      { label: "Seine-Saint-Denis", codes: ["93"] },
    ]);
  });

  it("n'ajoute pas d'outre-mer sans département d'outre-mer en ligne", () => {
    expect(publishedAreas([online("04", "Alpes-de-Haute-Provence")])).toEqual([
      { label: "Alpes-de-Haute-Provence", codes: ["04"] },
    ]);
  });

  it("ne donne aucune zone sans cahier publié", () => {
    expect(publishedAreas([])).toEqual([]);
  });
});

describe("areaHref", () => {
  it("mène à la recherche filtrée sur les codes de la zone", () => {
    expect(areaHref({ label: "Outre-mer", codes: ["971", "974"] })).toBe(
      "/search?place=971,974",
    );
  });
});

describe("areaHrefByCode", () => {
  it("envoie chaque département vers la recherche de sa zone", () => {
    const hrefs = areaHrefByCode(publishedAreas(DEPARTMENTS));
    expect(hrefs.get("25")).toBe("/search?place=25");
    expect(hrefs.get("972")).toBe("/search?place=971,972");
    expect(hrefs.has("75")).toBe(false);
  });
});
