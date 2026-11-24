import { describe, expect, it, vi } from "vitest";
import { renderToHtml } from "@/test/render";
import SearchPage, { metadata } from "./page";

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

    expect(metadata).toEqual({ title: "Rechercher" });
    expect(html).toContain("fr-breadcrumb");
    expect(html).toContain("<h1>Rechercher dans les cahiers</h1>");
    expect(html).toContain("ne répond à « carburant »");
  });
});
