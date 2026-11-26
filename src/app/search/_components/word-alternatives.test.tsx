import { describe, expect, it } from "vitest";
import { renderToHtml } from "@/test/render";
import { WordAlternatives } from "./word-alternatives";

describe("WordAlternatives", () => {
  it("propose les mots qui commencent par la saisie, en liens", async () => {
    const html = await renderToHtml(
      <WordAlternatives
        suggestions={[
          { word: "retraite", pageCount: 7 },
          { word: "retraité", pageCount: 1 },
        ]}
        placeCode="71106"
        keyword="retr"
      />,
    );

    expect(html).toContain(
      '<p id="word-alternatives-title" class="fr-mb-1w">Mots des cahiers publiés qui commencent par « retr » :</p>',
    );
    expect(html).toContain('<ul aria-labelledby="word-alternatives-title">');
    expect(html).toMatch(
      /<a href="\/search\?place=71106&amp;q=retraite">retraite<\/a> \(7 pages\)/,
    );
    expect(html).toMatch(/q=retrait%C3%A9">retraité<\/a> \(1 page\)/);
  });

  it("ne dit rien sans mot à proposer", async () => {
    const html = await renderToHtml(
      <WordAlternatives suggestions={[]} placeCode="" keyword="zzz" />,
    );

    expect(html).toBe("");
  });
});
