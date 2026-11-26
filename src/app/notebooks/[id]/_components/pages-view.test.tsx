// @vitest-environment happy-dom
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEBOUNCE_MS } from "@/app/_components/place-keyword/use-debounced-json";
import { mount, unmount } from "@/test/dom";
import { PagesView } from "./pages-view";

const PAGES = [
  { number: 1, width: 100, height: 200, text: "Rien ici" },
  { number: 2, width: 100, height: 200, text: "La retraite et la Retraite" },
  { number: 4, width: 100, height: 200, text: "retraite" },
];

function view(keyword: string, pages = PAGES) {
  return (
    <PagesView notebookId="CC_1" version={2} pages={pages} keyword={keyword} />
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PagesView", () => {
  it("sans mot-clé, affiche les pages telles quelles", () => {
    const html = renderToStaticMarkup(view(""));

    expect(html).not.toContain("<mark");
    expect(html).not.toContain("fr-highlight");
    expect(html).toContain("Aller à une page");
    expect(html.match(/<section /g)).toHaveLength(3);
  });

  it("surligne chaque occurrence et nomme la première", () => {
    const html = renderToStaticMarkup(view("retraite"));

    expect(html).toContain(
      "3 occurrences de « retraite » surlignées dans ce cahier, sur 2 pages.",
    );
    expect(html.match(/<mark /g)).toHaveLength(3);
    expect(html.match(/id="first-occurrence"/g)).toHaveLength(1);
    expect(html.indexOf('id="first-occurrence"')).toBeGreaterThan(
      html.indexOf('id="page-2"'),
    );
  });

  it("dit qu'un mot absent du cahier n'est pas surligné, sans lire les lignes", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const html = renderToStaticMarkup(view("impot", [PAGES[0]]));

    expect(html).toContain("Aucune occurrence de « impot » dans ce cahier.");
    expect(html).not.toContain("Aller à une page");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("pose les lignes trouvées sur l'image de leur page", async () => {
    const fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ lines: [{ page: 4, points: "0,0 10,0 10,5" }] }),
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const mounted = await mount(view("retraite"));
    await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));

    expect(fetch).toHaveBeenCalledWith(
      "/notebooks/CC_1/lines?v=2&q=retraite",
      expect.anything(),
    );
    const svgs = mounted.container.querySelectorAll("section svg");
    expect(svgs).toHaveLength(1);
    expect(svgs[0].closest("section")?.id).toBe("page-4");
    unmount(mounted);
  });
});
