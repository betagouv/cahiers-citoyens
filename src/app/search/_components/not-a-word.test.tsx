import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedPlace } from "@/lib/page-search/find-place";
import { listPages } from "@/lib/page-search/list-pages";
import { suggestWords } from "@/lib/page-search/suggest-words";
import { renderToHtml } from "@/test/render";
import { NotAWord } from "./not-a-word";

vi.mock("@/lib/page-search/suggest-words", () => ({ suggestWords: vi.fn() }));
vi.mock("@/lib/page-search/list-pages", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/page-search/list-pages")>()),
  listPages: vi.fn(),
}));

const charolles: ResolvedPlace = {
  codes: { kind: "municipality", code: "71106" },
  label: "Charolles (71)",
  pageCount: 21,
};

const hit = {
  notebookId: "nb-1",
  number: 3,
  municipalityName: "Charolles",
  departmentCode: "71",
  excerpt: "Début de la page",
};

const retraite = [{ word: "retraite", pageCount: 7 }];

function render(place: ResolvedPlace | undefined, pageIndex = 1) {
  return renderToHtml(
    <NotAWord
      place={place}
      placeCode={place === undefined ? "" : "71106"}
      keyword="retr"
      pageIndex={pageIndex}
    />,
  );
}

beforeEach(() => {
  vi.mocked(suggestWords).mockReset();
  vi.mocked(listPages).mockReset();
  vi.mocked(listPages).mockResolvedValue([hit]);
});

describe("NotAWord", () => {
  it("montre les pages du lieu annoncées par le bouton, sous l'avis", async () => {
    vi.mocked(suggestWords).mockResolvedValue(retraite);

    const html = await render(charolles, 2);

    expect(suggestWords).toHaveBeenCalledWith("retr", charolles.codes);
    expect(listPages).toHaveBeenCalledWith(charolles.codes, "", 2);
    expect(html).toMatch(
      /<h2 id="word-notice-title"[^>]*>« retr » n’est pas un mot des cahiers de Charolles \(71\)<\/h2>/,
    );
    expect(html).toContain(">retraite</a> (7 pages)");
    expect(html).toMatch(
      /<h2 id="results-title"[^>]*>Les 21 pages de Charolles \(71\)<\/h2>/,
    );
    expect(html).toContain(">Charolles (71), page 3</a>");
    expect(html).not.toContain("<mark");
    expect(html).toContain('href="/search?place=71106&amp;q=retr"');
  });

  it("montre les pages du lieu même sans mot à proposer", async () => {
    vi.mocked(suggestWords).mockResolvedValue([]);

    const html = await render(charolles);

    expect(html).toContain("n’est pas un mot des cahiers de Charolles (71)");
    expect(html).not.toContain("word-alternatives-title");
    expect(html).toContain("Les 21 pages de Charolles (71)");
  });

  it("sans lieu, n'affiche que l'avis et les mots proposés", async () => {
    vi.mocked(suggestWords).mockResolvedValue(retraite);

    const html = await render(undefined);

    expect(listPages).not.toHaveBeenCalled();
    expect(html).toContain("« retr » n’est pas un mot des cahiers publiés");
    expect(html).toContain(">retraite</a> (7 pages)");
    expect(html).not.toContain('id="results-title"');
  });

  it("sans page du lieu ni mot proposé, garde l'état vide", async () => {
    vi.mocked(suggestWords).mockResolvedValue([]);

    const html = await render({ ...charolles, pageCount: 0 });

    expect(listPages).not.toHaveBeenCalled();
    expect(html).toContain(
      "Aucune page publiée à Charolles (71) ne contient « retr »",
    );
    expect(html).toContain('href="/publication"');
  });
});
