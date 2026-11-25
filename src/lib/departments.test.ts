import { describe, expect, it } from "vitest";
import {
  PUBLISHED_AREAS,
  areaHref,
  onlineMetropolitanDepartmentCount,
  publicationStatus,
  publishedAreaOf,
} from "./departments";

describe("publicationStatus", () => {
  it("met en ligne les départements d'une zone publiée, outre-mer compris", () => {
    expect(publicationStatus("25")).toBe("online");
    expect(publicationStatus("974")).toBe("online");
  });

  it("annonce à venir tout autre département", () => {
    expect(publicationStatus("75")).toBe("upcoming");
    expect(publicationStatus("2A")).toBe("upcoming");
  });
});

describe("PUBLISHED_AREAS", () => {
  it("ne range aucun département dans deux zones", () => {
    const codes = PUBLISHED_AREAS.flatMap((area) => area.codes);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("areaHref", () => {
  it("mène à la recherche filtrée sur les codes de la zone", () => {
    const overseas = publishedAreaOf("971");
    expect(overseas?.label).toBe("Outre-mer");
    expect(overseas && areaHref(overseas)).toBe(
      "/search?place=971,972,973,974,976",
    );
  });
});

describe("onlineMetropolitanDepartmentCount", () => {
  it("compte les départements de métropole en ligne, sans l'outre-mer", () => {
    expect(onlineMetropolitanDepartmentCount()).toBe(7);
  });
});
