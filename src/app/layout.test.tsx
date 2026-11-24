import { describe, expect, it, vi } from "vitest";
import { renderToHtml } from "@/test/render";
import RootLayout, { metadata } from "./layout";

vi.mock("next/navigation", () => ({ useSelectedLayoutSegment: () => null }));

describe("RootLayout", () => {
  it("encadre la page de l'en-tête et du pied de page DSFR, en français", async () => {
    const html = await renderToHtml(
      <RootLayout params={Promise.resolve({})}>
        <p>Contenu de la page</p>
      </RootLayout>,
    );

    expect(metadata.title).toEqual({
      default: "Cahiers citoyens",
      template: "%s | Cahiers citoyens",
    });
    expect(html).toMatch(/<html[^>]*lang="fr"/);
    expect(html).toMatch(/<html[^>]*data-fr-scheme="light"/);
    expect(html).toContain('href="#content"');
    expect(html).toContain('href="#footer"');
    expect(html).toMatch(/<header[^>]*class="fr-header"/);
    expect(html).toMatch(/href="\/search"[^>]*>Rechercher</);
    expect(html).toContain(
      '<main id="content" class="flex-1"><p>Contenu de la page</p></main>',
    );
    expect(html).toMatch(/<footer[^>]*id="footer"/);
  });
});
