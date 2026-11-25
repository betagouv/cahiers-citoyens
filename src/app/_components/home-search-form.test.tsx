import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeSearchForm } from "./home-search-form";

describe("HomeSearchForm", () => {
  it("envoie le lieu et le mot-clé en GET sur /search, sans JavaScript", () => {
    const html = renderToStaticMarkup(<HomeSearchForm />);

    expect(html).toMatch(/<form[^>]*action="\/search"/);
    expect(html).toMatch(/<form[^>]*role="search"/);
    expect(html).toMatch(
      /<input[^>]*id="place-keyword-place"[^>]*name="place"/,
    );
    expect(html).toMatch(/<input[^>]*id="place-keyword-keyword"[^>]*name="q"/);
    expect(html).not.toContain('type="hidden"');
    expect(html).toContain("Commune, code postal ou département");
    expect(html).toContain("Par exemple : retraite");
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Rechercher/);
  });

  it("expose deux listes de suggestions fermées", () => {
    const html = renderToStaticMarkup(<HomeSearchForm />);

    expect(html.match(/role="combobox"/g)).toHaveLength(2);
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(html).toContain('aria-controls="place-keyword-place-listbox"');
    expect(html).toContain('id="place-keyword-place-listbox" role="listbox"');
  });

  it("reprend le lieu reconnu et le mot-clé d'une recherche", () => {
    const html = renderToStaticMarkup(
      <HomeSearchForm
        id="search-pages"
        initialPlace={{
          code: "71106",
          label: "Charolles (71)",
          pageCount: 286,
        }}
        initialKeyword="retraite"
      />,
    );

    // Sans JavaScript, l'étiquette part telle quelle : `/search` la reconnaît.
    expect(html).toMatch(
      /<input[^>]*name="place"[^>]*value="Charolles \(71\)"/,
    );
    expect(html).toMatch(/<input[^>]*name="q"[^>]*value="retraite"/);
    expect(html).toContain("Effacer le lieu");
    expect(html).toContain("Effacer le mot-clé");
  });

  it("garde le texte d'un lieu non reconnu", () => {
    const html = renderToStaticMarkup(
      <HomeSearchForm initialPlaceText="Nulle part" />,
    );

    expect(html).toMatch(/<input[^>]*name="place"[^>]*value="Nulle part"/);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Rechercher/);
  });
});
