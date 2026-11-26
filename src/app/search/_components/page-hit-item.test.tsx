import { describe, expect, it } from "vitest";
import { renderToHtml } from "@/test/render";
import { PageHitItem } from "./page-hit-item";

const hit = {
  notebookId: "nb 1",
  number: 12,
  municipalityName: "Charolles",
  departmentCode: "71",
  excerpt: "La ⟦retraite⟧ à <60> ans",
};

describe("PageHitItem", () => {
  it("relie la page à son cahier et marque le mot trouvé", async () => {
    const html = await renderToHtml(
      <PageHitItem hit={hit} keyword="retraite" />,
    );

    expect(html).toContain(
      '<a href="/notebooks/nb%201">Charolles (71), page 12</a>',
    );
    expect(html).toContain("Cahier nb 1");
    expect(html).toMatch(/La <mark[^>]*>retraite<\/mark> à &lt;60&gt; ans/);
  });

  it("montre le début de la page sans mot-clé", async () => {
    const html = await renderToHtml(
      <PageHitItem
        hit={{ ...hit, excerpt: `Début ${"mot ".repeat(100)}` }}
        keyword=""
      />,
    );

    expect(html).not.toContain("<mark");
    expect(html).toContain("Début mot mot");
    expect(html).toContain("…");
  });

  it("se contente du peu qu'on sait du lieu", async () => {
    const withoutDepartment = await renderToHtml(
      <PageHitItem hit={{ ...hit, departmentCode: null }} keyword="" />,
    );
    const withoutPlace = await renderToHtml(
      <PageHitItem hit={{ ...hit, municipalityName: null }} keyword="" />,
    );

    expect(withoutDepartment).toContain(">Charolles, page 12</a>");
    expect(withoutPlace).toContain(">Commune non renseignée, page 12</a>");
  });
});
