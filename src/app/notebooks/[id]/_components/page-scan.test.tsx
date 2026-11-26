import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageScan } from "./page-scan";

const PAGE = { number: 3, width: 1200, height: 1700, text: "" };
const SRC = "/notebooks/CC_1/pages/3?v=2";

describe("PageScan", () => {
  it("montre l'image seule sans ligne à teinter", () => {
    const html = renderToStaticMarkup(
      <PageScan src={SRC} page={PAGE} first={false} lines={[]} />,
    );

    expect(html).toContain('width="1200" height="1700"');
    expect(html).toContain(
      `<a href="${SRC}" class="fr-link fr-link--sm">Ouvrir l&#x27;image de la page 3 en grand</a>`,
    );
    expect(html).not.toContain("<svg");
  });

  it("pose le calque des lignes sur l'image, dans le même cadre", () => {
    const html = renderToStaticMarkup(
      <PageScan src={SRC} page={PAGE} first lines={["0,0 10,0 10,5"]} />,
    );

    expect(html).toMatch(
      /<div class="relative [^"]*"><img [^>]*><svg aria-hidden="true"[^>]*viewBox="0 0 1200 1700"/,
    );
  });
});
