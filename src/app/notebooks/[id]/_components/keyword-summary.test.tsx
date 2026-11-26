import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KeywordSummary } from "./keyword-summary";

describe("KeywordSummary", () => {
  it("compte les occurrences et mène à la première", () => {
    const html = renderToStaticMarkup(
      <KeywordSummary keyword="retraite" occurrences={3} pages={2} />,
    );

    expect(html).toContain(
      "3 occurrences de « retraite » surlignées dans ce cahier, sur 2 pages.",
    );
    expect(html).toContain(
      '<a class="fr-link" href="#first-occurrence">Aller à la première occurrence</a>',
    );
  });

  it("accorde au singulier", () => {
    const html = renderToStaticMarkup(
      <KeywordSummary keyword="impôt" occurrences={1} pages={1} />,
    );

    expect(html).toContain(
      "1 occurrence de « impôt » surlignée dans ce cahier, sur 1 page.",
    );
  });

  it("dit qu'aucune occurrence n'est surlignée", () => {
    const html = renderToStaticMarkup(
      <KeywordSummary keyword="impot" occurrences={0} pages={0} />,
    );

    expect(html).toBe(
      '<p class="fr-highlight fr-mb-4w">Aucune occurrence de « impot » dans ce cahier.</p>',
    );
  });
});
