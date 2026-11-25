import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Accessibility, { metadata as accessibility } from "./accessibility/page";
import Faq, { metadata as faq } from "./faq/page";
import LegalNotice, { metadata as legalNotice } from "./legal-notice/page";
import PersonalData, { metadata as personalData } from "./personal-data/page";
import Publication, { metadata as publication } from "./publication/page";
import SiteMap, { metadata as siteMap } from "./site-map/page";
import Understanding, { metadata as understanding } from "./understanding/page";

describe("pages provisoires", () => {
  it.each([
    [Understanding, understanding, "Comprendre les cahiers"],
    [Publication, publication, "Publication des cahiers"],
    [Faq, faq, "Questions fréquentes"],
    [Accessibility, accessibility, "Accessibilité"],
    [LegalNotice, legalNotice, "Mentions légales"],
    [PersonalData, personalData, "Données personnelles"],
  ])("signalent leur texte fictif sous leur titre", (Page, metadata, title) => {
    const html = renderToStaticMarkup(<Page />);

    expect(metadata).toEqual({ title });
    expect(html).toContain(`<h1>${title}</h1>`);
    expect(html).toContain("Page provisoire");
    expect(html).toMatch(/<h2 class="fr-h4">/);
  });
});

describe("plan du site", () => {
  it("liste les pages du site", () => {
    const html = renderToStaticMarkup(<SiteMap />);

    expect(siteMap).toEqual({ title: "Plan du site" });
    expect(html).toMatch(/href="\/notebooks"[^>]*>Tous les cahiers</);
    expect(html).toMatch(/href="\/legal-notice"[^>]*>Mentions légales</);
  });
});
