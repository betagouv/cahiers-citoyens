import { describe, expect, it, vi } from "vitest";
import { renderToHtml } from "@/test/render";
import SearchPage, { generateMetadata } from "./page";

vi.mock("./_components/page-search-metadata", () => ({
  pageSearchMetadata: () => Promise.resolve({ title: "Cahiers de Doubs (25)" }),
}));

vi.mock("@/lib/search/search", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/search/search")>()),
  searchNotebooks: () => Promise.resolve({ status: "no-results", notices: [] }),
}));

describe("SearchPage", () => {
  it("affiche le fil d'Ariane, le titre et la section de recherche", async () => {
    const html = await renderToHtml(
      <SearchPage
        params={Promise.resolve({})}
        searchParams={Promise.resolve({ q: "carburant" })}
      />,
    );

    expect(html).toContain("fr-breadcrumb");
    expect(html).toContain("<h1>Rechercher dans les cahiers</h1>");
    expect(html).toContain("ne répond à « carburant »");
  });
});

describe("generateMetadata", () => {
  function metadataFor(searchParams: Record<string, string>) {
    return generateMetadata({
      params: Promise.resolve({}),
      searchParams: Promise.resolve(searchParams),
    });
  }

  it("titre « Rechercher » une question en langage courant", async () => {
    await expect(metadataFor({ q: "carburant" })).resolves.toEqual({
      title: "Rechercher",
    });
  });

  it("titre une recherche par lieu et mot-clé d'après elle", async () => {
    await expect(metadataFor({ place: "25" })).resolves.toEqual({
      title: "Cahiers de Doubs (25)",
    });
  });
});
