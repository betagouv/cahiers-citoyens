import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HighlightedText } from "./highlighted-text";

const SEGMENTS = [
  { text: "La ", highlighted: false },
  { text: "retraite", highlighted: true },
  { text: " et la ", highlighted: false },
  { text: "retraite", highlighted: true },
];

describe("HighlightedText", () => {
  it("met chaque mot trouvé dans `mark`, en gras", () => {
    expect(renderToStaticMarkup(<HighlightedText segments={SEGMENTS} />)).toBe(
      'La <mark class="bg-[var(--background-contrast-yellow-tournesol)] font-bold text-[var(--text-title-grey)]">retraite</mark> et la <mark class="bg-[var(--background-contrast-yellow-tournesol)] font-bold text-[var(--text-title-grey)]">retraite</mark>',
    );
  });

  it("nomme la première marque seulement", () => {
    const html = renderToStaticMarkup(
      <HighlightedText segments={SEGMENTS} firstId="first-occurrence" />,
    );

    expect(html.match(/id="first-occurrence"/g)).toHaveLength(1);
    expect(html).toMatch(/^La <mark id="first-occurrence"/);
  });
});
