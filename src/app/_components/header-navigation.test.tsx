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
    ["search", ["Rechercher"]],
    ["notebooks", ["Cahiers"]],
    [null, []],
  ])(
    "sous le segment %j, marque %j comme rubrique courante",
    (current, active) => {
      segment.current = current;

      const html = renderToStaticMarkup(<HeaderNavigation />);

      expect(html).toMatch(/href="\/search"[^>]*>Rechercher</);
      expect(html).toMatch(/href="\/notebooks"[^>]*>Cahiers</);
      expect(activeLinks(html)).toEqual(active);
    },
  );
});
