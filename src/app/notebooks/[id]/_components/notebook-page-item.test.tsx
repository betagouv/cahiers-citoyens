import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotebookPageItem } from "./notebook-page-item";

const PAGE = { number: 3, width: 1200, height: 1700, text: "Ligne 1\nLigne 2" };

function render(page = PAGE, first = false) {
  return renderToStaticMarkup(
    <NotebookPageItem
      notebookId="CC_1"
      version={2}
      page={page}
      first={first}
    />,
  );
}

describe("NotebookPageItem", () => {
  it("place l'image dimensionnée et la transcription sous l'ancre de la page", () => {
    const html = render();

    expect(html).toContain(
      '<section id="page-3" aria-labelledby="page-3-title"',
    );
    expect(html).toContain('<h2 id="page-3-title" class="fr-h4">Page 3</h2>');
    expect(html).toContain(
      'alt="Image numérisée de la page 3, transcrite à la suite"',
    );
    expect(html).toContain('width="1200" height="1700"');
    expect(html).toContain('src="/notebooks/CC_1/pages/3?v=2"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('href="/notebooks/CC_1/pages/3?v=2"');
    expect(html).toContain(
      '<p class="whitespace-pre-line">Ligne 1\nLigne 2</p>',
    );
  });

  it("charge la première image sans attendre le défilement", () => {
    const html = render(PAGE, true);

    expect(html).not.toContain('loading="lazy"');
    expect(html).toContain('fetchPriority="high"');
  });

  it("signale une page sans texte", () => {
    expect(render({ ...PAGE, text: "" })).toContain(
      "Aucun texte transcrit sur cette page.",
    );
  });
});
