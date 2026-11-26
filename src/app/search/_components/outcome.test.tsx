import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Source } from "@/lib/search/search";
import { Outcome } from "./outcome";

const SOURCE: Source = {
  id: 10,
  number: 1,
  notebookId: "notebook-0001",
  page: 2,
  content: "Plus de médecin au village.",
};

describe("Outcome", () => {
  it("sans passage trouvé, propose de reformuler et garde les avis", () => {
    const html = renderToStaticMarkup(
      <Outcome
        question="médecin"
        outcome={{
          status: "no-results",
          notices: ["Recherche par mots seulement."],
        }}
      />,
    );

    expect(html).toContain("Recherche par mots seulement.");
    expect(html).toContain("ne répond à « médecin »");
    expect(html).not.toContain("Sources");
  });

  it("sans réponse rédigée, explique pourquoi et liste les sources", () => {
    const html = renderToStaticMarkup(
      <Outcome
        question="médecin"
        outcome={{
          status: "sources-only",
          reason: "La rédaction de la réponse a échoué.",
          sources: [SOURCE],
          notices: [],
        }}
      />,
    );

    expect(html).toMatch(
      /fr-alert--warning[^>]*>.*La rédaction de la réponse a échoué\./,
    );
    expect(html).toContain("[1] Cahier notebook-0001");
    expect(html).not.toContain("Réponse</h2>");
  });

  it("affiche la réponse puis ses sources", () => {
    const html = renderToStaticMarkup(
      <Outcome
        question="médecin"
        outcome={{
          status: "answered",
          answer: "Il manque des médecins [1].",
          chatModel: "modele-test",
          sources: [SOURCE],
          notices: [],
        }}
      />,
    );

    expect(html.indexOf("Réponse</h2>")).toBeLessThan(
      html.indexOf("Sources</h2>"),
    );
    expect(html).toContain('href="#source-1"');
    expect(html).toContain("modele-test");
  });
});
