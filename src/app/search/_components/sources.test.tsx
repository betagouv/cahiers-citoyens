import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Sources } from "./sources";

describe("Sources", () => {
  it("affiche une carte par source, ancrée sur son numéro et liée à son cahier", () => {
    const html = renderToStaticMarkup(
      <Sources
        sources={[
          {
            id: 10,
            number: 1,
            notebookId: "notebook-0001",
            content: "Plus de  médecin\nau village.",
          },
          {
            id: 20,
            number: 2,
            notebookId: "notebook-0002",
            content: "Le prix du carburant.",
          },
        ]}
      />,
    );

    expect([...html.matchAll(/id="source-(\d)"/g)].map(([, n]) => n)).toEqual([
      "1",
      "2",
    ]);
    expect(html).toContain("[1] Cahier notebook-0001");
    expect(html).toContain('href="/notebooks/notebook-0002"');
    expect(html).toContain("Plus de médecin au village.");
  });
});
