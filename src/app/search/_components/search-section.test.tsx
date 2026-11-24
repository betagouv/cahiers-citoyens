import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchOutcome } from "@/lib/search/search";
import { renderToHtml } from "@/test/render";
import { SearchSection } from "./search-section";

const searchNotebooks = vi.hoisted(() =>
  vi.fn<(question: string) => Promise<SearchOutcome>>(),
);

vi.mock("@/lib/search/search", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/search/search")>()),
  searchNotebooks,
}));

function render(q?: string | string[]): Promise<string> {
  return renderToHtml(<SearchSection searchParams={Promise.resolve({ q })} />);
}

beforeEach(() => {
  searchNotebooks.mockReset();
});

describe("SearchSection", () => {
  it("sans question, montre le formulaire vide et des exemples", async () => {
    const html = await render();

    expect(searchNotebooks).not.toHaveBeenCalled();
    expect(html).toMatch(/<form[^>]*id="search-page"/);
    expect(html).toContain("Par exemple :");
  });

  it("cherche la question nettoyée, la reprend dans le champ et affiche le résultat", async () => {
    searchNotebooks.mockResolvedValue({ status: "no-results", notices: [] });

    const html = await render(["  médecin  ", "ignoré"]);

    expect(searchNotebooks).toHaveBeenCalledWith("médecin");
    expect(html).toMatch(/<input[^>]*value="médecin"/);
    expect(html).toContain("ne répond à « médecin »");
    expect(html).not.toContain("Par exemple :");
    expect(html).not.toContain("Recherche des passages");
  });
});
