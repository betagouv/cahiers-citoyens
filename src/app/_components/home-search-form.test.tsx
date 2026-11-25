import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeSearchForm } from "./home-search-form";

describe("HomeSearchForm", () => {
  it("envoie le lieu et le mot-clé en GET sur /search", () => {
    const html = renderToStaticMarkup(<HomeSearchForm />);

    expect(html).toMatch(/<form[^>]*action="\/search"/);
    expect(html).toMatch(/<input[^>]*name="place"/);
    expect(html).toMatch(/<input[^>]*name="q"/);
    expect(html).toContain("Commune, code postal ou département");
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Rechercher/);
  });
});
