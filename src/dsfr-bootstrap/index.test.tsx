import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DsfrProvider } from "./index";

describe("DsfrProvider", () => {
  it("rend ses enfants", () => {
    expect(
      renderToStaticMarkup(
        <DsfrProvider lang="fr">
          <p>Contenu</p>
        </DsfrProvider>,
      ),
    ).toContain("<p>Contenu</p>");
  });
});
