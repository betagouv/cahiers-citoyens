import { describe, expect, it, vi } from "vitest";
import { renderToHtml } from "@/test/render";
import Home from "./page";

// La carte, client et WebGL, a son propre test.
vi.mock("@/app/_components/department-map", () => ({
  DepartmentMap: () => null,
}));

describe("Home", () => {
  it("propose la recherche, les départements en ligne et les clés de lecture", async () => {
    const html = await renderToHtml(<Home />);

    expect(html).toMatch(/<h1[^>]*>Rechercher des cahiers citoyens<\/h1>/);
    expect(html).toMatch(/<form[^>]*action="\/search"/);
    expect(html).toContain("dans 7 départements et les outre-mer");
    expect(html).toMatch(/href="\/search\?place=25"[^>]*>Doubs</);
    expect(html).toContain("Pas de cahier dans le fonds numérisé");
    expect(html).toMatch(
      /href="\/publication"[^>]*>Voir l&#x27;état de publication/,
    );
    expect(html).toContain("Pour bien lire les cahiers");
    expect(html).toMatch(/href="\/faq"/);
  });
});
