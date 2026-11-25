import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HeaderNavigation } from "./header-navigation";

const segment = vi.hoisted(() => {
  const state: { current: string | null } = { current: null };
  return state;
});

vi.mock("next/navigation", () => ({
  useSelectedLayoutSegment: () => segment.current,
}));

function activeLinks(html: string): string[] {
  return [...html.matchAll(/<a [^>]*aria-current="page"[^>]*>([^<]*)</g)].map(
    ([, text]) => text,
  );
}

describe("HeaderNavigation", () => {
  it.each([
    [null, ["Accueil"]],
    ["understanding", ["Comprendre les cahiers"]],
    ["publication", ["Publication des cahiers"]],
    ["faq", ["Questions fréquentes"]],
    ["search", []],
  ])(
    "sous le segment %j, marque %j comme rubrique courante",
    (current, active) => {
      segment.current = current;

      const html = renderToStaticMarkup(<HeaderNavigation />);

      expect(html).toMatch(/href="\/"[^>]*>Accueil</);
      expect(html).toMatch(/href="\/faq"[^>]*>Questions fréquentes</);
      expect(activeLinks(html)).toEqual(active);
    },
  );
});
