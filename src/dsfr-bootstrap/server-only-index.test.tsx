import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DsfrHead, getHtmlAttributes } from "./server-only-index";

describe("getHtmlAttributes", () => {
  it("pose la langue et le thème clair par défaut sur <html>", () => {
    expect(getHtmlAttributes({ lang: "fr" })).toMatchObject({
      lang: "fr",
      "data-fr-scheme": "light",
    });
  });
});

describe("DsfrHead", () => {
  it("précharge les polices demandées", () => {
    const html = renderToStaticMarkup(
      <DsfrHead preloadFonts={["Marianne-Regular"]} />,
    );

    expect(html).toMatch(/<link[^>]*rel="preload"[^>]*Marianne-Regular/);
  });
});
