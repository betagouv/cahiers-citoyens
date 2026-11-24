import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SearchForm } from "./search-form";

describe("SearchForm", () => {
  it("envoie la question en GET sur /search, dans le champ q", () => {
    const html = renderToStaticMarkup(<SearchForm id="home-search" />);

    expect(html).toMatch(/<form[^>]*action="\/search"/);
    expect(html).toMatch(/<form[^>]*role="search"/);
    expect(html).toMatch(/<form[^>]*class="fr-search-bar"/);
    expect(html).toContain('<label class="fr-label" for="home-search-input">');
    expect(html).toMatch(/<input[^>]*id="home-search-input"[^>]*name="q"/);
    expect(html).not.toMatch(/<input[^>]*value=/);
  });

  it("préremplit la question et agrandit la barre sur demande", () => {
    const html = renderToStaticMarkup(
      <SearchForm id="search-page" defaultValue="médecin" big />,
    );

    expect(html).toMatch(/class="fr-search-bar fr-search-bar--lg"/);
    expect(html).toMatch(/<input[^>]*value="médecin"/);
  });
});
