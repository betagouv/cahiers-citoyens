import { beforeEach, describe, expect, it, vi } from "vitest";
import { suggestWords } from "@/lib/page-search/suggest-words";
import { renderToHtml } from "@/test/render";
import { WordAlternatives } from "./word-alternatives";

vi.mock("@/lib/page-search/suggest-words", () => ({ suggestWords: vi.fn() }));

const charolles = { kind: "municipality", code: "71106" } as const;

beforeEach(() => {
  vi.mocked(suggestWords).mockReset();
});

describe("WordAlternatives", () => {
  it("propose les mots qui commencent par la saisie, en liens", async () => {
    vi.mocked(suggestWords).mockResolvedValue([
      { word: "retraite", pageCount: 7 },
      { word: "retraité", pageCount: 1 },
    ]);

    const html = await renderToHtml(
      <WordAlternatives place={charolles} placeCode="71106" keyword="retr" />,
    );

    expect(suggestWords).toHaveBeenCalledWith("retr", charolles);
    expect(html).toContain(
      '<p id="word-alternatives-title" class="fr-mb-1w">Mots des cahiers publiés qui commencent par « retr » :</p>',
    );
    expect(html).toContain('<ul aria-labelledby="word-alternatives-title">');
    expect(html).toMatch(
      /<a href="\/search\?place=71106&amp;q=retraite">retraite<\/a> \(7 pages\)/,
    );
    expect(html).toMatch(/q=retrait%C3%A9">retraité<\/a> \(1 page\)/);
  });

  it("ne dit rien sans mot à proposer", async () => {
    vi.mocked(suggestWords).mockResolvedValue([]);

    const html = await renderToHtml(
      <WordAlternatives place={undefined} placeCode="" keyword="zzz" />,
    );

    expect(html).toBe("");
  });
});
