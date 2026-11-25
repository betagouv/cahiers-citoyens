import { beforeEach, describe, expect, it, vi } from "vitest";
import { countPages } from "@/lib/page-search/count-pages";
import { listPages } from "@/lib/page-search/list-pages";
import { renderToHtml } from "@/test/render";
import { PageResults } from "./page-results";

vi.mock("@/lib/page-search/count-pages", () => ({ countPages: vi.fn() }));
vi.mock("./not-a-word", () => ({
  NotAWord: ({ keyword }: { keyword: string }) => <p>Pas un mot : {keyword}</p>,
}));
vi.mock("@/lib/page-search/list-pages", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/page-search/list-pages")>()),
  listPages: vi.fn(),
}));

const charolles = {
  codes: { kind: "municipality", code: "71106" },
  label: "Charolles (71)",
  pageCount: 286,
} as const;

const hit = {
  notebookId: "nb-1",
  number: 12,
  municipalityName: "Charolles",
  departmentCode: "71",
  excerpt: "La ⟦retraite⟧",
};

beforeEach(() => {
  vi.mocked(countPages).mockReset();
  vi.mocked(listPages).mockReset();
});

describe("PageResults", () => {
  it("annonce le total et liste les pages trouvées", async () => {
    vi.mocked(countPages).mockResolvedValue(7);
    vi.mocked(listPages).mockResolvedValue([hit]);

    const html = await renderToHtml(
      <PageResults place={charolles} keyword="retraite" pageIndex={1} />,
    );

    expect(countPages).toHaveBeenCalledWith(charolles.codes, "retraite");
    expect(listPages).toHaveBeenCalledWith(charolles.codes, "retraite", 1);
    expect(html).toContain(
      "7 pages à Charolles (71) contiennent « retraite »</h2>",
    );
    expect(html).toContain("<ol");
    expect(html).not.toContain("fr-pagination");
    expect(html).not.toContain("Page 1 sur");
  });

  it("pagine par 20, avec des liens qui gardent lieu et mot-clé", async () => {
    vi.mocked(countPages).mockResolvedValue(45);
    vi.mocked(listPages).mockResolvedValue([hit]);

    const html = await renderToHtml(
      <PageResults place={undefined} keyword="retraite" pageIndex={2} />,
    );

    expect(html).toContain("45 pages contiennent « retraite »");
    expect(html).toContain("Page 2 sur 3");
    expect(html).toContain('href="/search?place=&amp;q=retraite&amp;page=3"');
    expect(html).toContain('href="/search?place=&amp;q=retraite"');
  });

  it("explique l'absence de page", async () => {
    vi.mocked(countPages).mockResolvedValue(0);
    vi.mocked(listPages).mockResolvedValue([]);

    const html = await renderToHtml(
      <PageResults place={charolles} keyword="" pageIndex={1} />,
    );

    expect(html).toContain(
      "Aucune page publiée à Charolles (71) pour l’instant",
    );
    expect(html).toContain('href="/publication"');
    expect(html).not.toContain("<ol");
  });

  it("passe la main à NotAWord pour un mot-clé sans page", async () => {
    vi.mocked(countPages).mockResolvedValue(0);
    vi.mocked(listPages).mockResolvedValue([]);

    const html = await renderToHtml(
      <PageResults place={charolles} keyword="retr" pageIndex={1} />,
    );

    expect(html).toBe("<p>Pas un mot : retr</p>");
  });

  it("renvoie à la première page au-delà de la dernière", async () => {
    vi.mocked(countPages).mockResolvedValue(7);
    vi.mocked(listPages).mockResolvedValue([]);

    const html = await renderToHtml(
      <PageResults place={charolles} keyword="retraite" pageIndex={9} />,
    );

    expect(html).toContain("Cette page de résultats n’existe pas.");
    expect(html).toContain('href="/search?place=71106&amp;q=retraite"');
  });
});
