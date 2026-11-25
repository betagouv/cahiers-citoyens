import { describe, expect, it, vi } from "vitest";
import { renderToHtml } from "@/test/render";
import Home from "./page";

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));
vi.mock("@/lib/notebooks", () => ({
  getCorpusStats: () =>
    Promise.resolve({
      notebookCount: 3,
      chunkCount: 9,
      embeddedChunkCount: 9,
      firstOpenedOn: "2019-01-05",
      lastOpenedOn: "2019-01-28",
    }),
}));

describe("Home", () => {
  it("présente le service, la recherche, les chiffres du corpus et la liste des cahiers", async () => {
    const html = await renderToHtml(<Home />);

    expect(html).toContain("<h1>Cahiers citoyens</h1>");
    expect(html).toMatch(/<form[^>]*id="home-search"/);
    expect(html).toContain("Cahiers fictifs");
    expect(html).toContain("cahiers numérisés");
    expect(html).toContain("janvier 2019");
    expect(html).not.toContain("Chargement des chiffres");
    expect(html).toMatch(/href="\/notebooks"[^>]*>Parcourir les cahiers/);
  });
});
