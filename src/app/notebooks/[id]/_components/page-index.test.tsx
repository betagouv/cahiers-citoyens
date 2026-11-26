import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageIndex } from "./page-index";

describe("PageIndex", () => {
  it("lie chaque page à son ancre, numéro précédé de « Page » pour les lecteurs d'écran", () => {
    const html = renderToStaticMarkup(
      <PageIndex
        pages={[
          { number: 1, width: 10, height: 10, text: "" },
          { number: 3, width: 10, height: 10, text: "" },
        ]}
      />,
    );

    expect(html).toContain('<nav aria-labelledby="page-index-title"');
    expect(html).toContain(
      '<a class="fr-tag" href="#page-3"><span class="fr-sr-only">Page </span>3</a>',
    );
    expect(html.match(/<li>/g)).toHaveLength(2);
  });
});
