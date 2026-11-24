import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Answer } from "./answer";

describe("Answer", () => {
  it("lie chaque renvoi [n] à sa source, paragraphe par paragraphe", () => {
    const html = renderToStaticMarkup(
      <Answer
        text={
          "Les habitants manquent de médecins [1].\n\nIls citent le carburant [2] et [7]."
        }
        sourceCount={2}
        chatModel="modele-test"
      />,
    );

    expect(html).toContain('<h2 id="answer-title" class="fr-h4">Réponse</h2>');
    expect(
      [...html.matchAll(/<p>(.*?)<\/p>/g)].map(([, inner]) => inner),
    ).toEqual([
      'Les habitants manquent de médecins <a href="#source-1" title="Source 1" class="fr-link">[1]</a>.',
      'Ils citent le carburant <a href="#source-2" title="Source 2" class="fr-link">[2]</a> et [7].',
    ]);
    expect(html).toContain("par le modèle modele-test (API Albert)");
  });
});
