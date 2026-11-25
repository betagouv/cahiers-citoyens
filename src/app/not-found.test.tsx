import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NotFound, { metadata } from "./not-found";

describe("NotFound", () => {
  it("affiche l'erreur 404 et renvoie vers les cahiers et la recherche", () => {
    const html = renderToStaticMarkup(<NotFound />);

    expect(metadata).toEqual({ title: "Page introuvable" });
    expect(html).toContain("<h1>Page introuvable</h1>");
    expect(html).toContain("Erreur 404");
    expect(html).toMatch(/href="\/notebooks"[^>]*>Parcourir les cahiers</);
    expect(html).toMatch(/href="\/search"[^>]*>Rechercher dans les cahiers</);
  });
});
