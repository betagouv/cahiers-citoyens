import { beforeEach, describe, expect, it, vi } from "vitest";
import { pageSearchMetadata } from "./page-search-metadata";
import { resolvePlaceForRequest } from "./resolve-place";

vi.mock("./resolve-place", () => ({ resolvePlaceForRequest: vi.fn() }));

const found = {
  status: "found",
  place: {
    codes: { kind: "municipality", code: "71106" },
    label: "Charolles (71)",
    displayName: "Charolles (71)",
    pageCount: 286,
  },
} as const;

beforeEach(() => {
  vi.mocked(resolvePlaceForRequest).mockResolvedValue(found);
});

describe("pageSearchMetadata", () => {
  it("rend indexables les pages d'un lieu", async () => {
    await expect(
      pageSearchMetadata({ place: "71106", keyword: "", pageIndex: 1 }),
    ).resolves.toEqual({
      title: "Cahiers de Charolles (71)",
      description:
        "Les pages des cahiers citoyens de Charolles (71), ouverts en mairie en 2019, transcrites et consultables.",
      robots: undefined,
    });
  });

  it("titre une ancienne commune par son nom de 2019 et sa commune actuelle", async () => {
    vi.mocked(resolvePlaceForRequest).mockResolvedValueOnce({
      status: "found",
      place: {
        codes: { kind: "municipality", code: "01039" },
        label: "Béon (01)",
        displayName: "Béon (ancienne commune, aujourd’hui Culoz-Béon)",
        pageCount: 3,
      },
    });

    const metadata = await pageSearchMetadata({
      place: "01039",
      keyword: "",
      pageIndex: 1,
    });

    expect(metadata.title).toBe(
      "Cahiers de Béon (ancienne commune, aujourd’hui Culoz-Béon)",
    );
  });

  it("n'indexe pas une recherche par mot-clé", async () => {
    const metadata = await pageSearchMetadata({
      place: "71106",
      keyword: "retraite",
      pageIndex: 2,
    });

    expect(metadata.title).toBe("« retraite » à Charolles (71), page 2");
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("n'indexe pas un lieu inconnu", async () => {
    vi.mocked(resolvePlaceForRequest).mockResolvedValue({
      status: "unknown",
      input: "zzz",
    });

    const metadata = await pageSearchMetadata({
      place: "zzz",
      keyword: "",
      pageIndex: 1,
    });

    expect(metadata.title).toBe("Rechercher");
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
