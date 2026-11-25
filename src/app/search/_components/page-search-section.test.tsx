import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToHtml } from "@/test/render";
import { PageSearchSection } from "./page-search-section";
import { resolvePlaceForRequest } from "./resolve-place";

vi.mock("./resolve-place", () => ({ resolvePlaceForRequest: vi.fn() }));
vi.mock("./page-results", () => ({
  PageResults: ({
    keyword,
    pageIndex,
  }: {
    keyword: string;
    pageIndex: number;
  }) => (
    <p>
      Résultats {keyword} {pageIndex}
    </p>
  ),
}));

beforeEach(() => {
  vi.mocked(resolvePlaceForRequest).mockReset();
});

describe("PageSearchSection", () => {
  it("préremplit le formulaire avec le lieu reconnu et montre les pages", async () => {
    vi.mocked(resolvePlaceForRequest).mockResolvedValue({
      status: "found",
      place: {
        codes: { kind: "departments", codes: ["971", "972"] },
        label: "Guadeloupe, Martinique",
        pageCount: 50,
      },
    });

    const html = await renderToHtml(
      <PageSearchSection
        search={{ place: "971,972", keyword: "", pageIndex: 2 }}
      />,
    );

    expect(resolvePlaceForRequest).toHaveBeenCalledWith("971,972");
    expect(html).toMatch(
      /<input[^>]*name="place"[^>]*value="Guadeloupe, Martinique"/,
    );
    expect(html).toContain("Résultats  2");
  });

  it("cherche un mot-clé dans toute la France", async () => {
    vi.mocked(resolvePlaceForRequest).mockResolvedValue({ status: "none" });

    const html = await renderToHtml(
      <PageSearchSection
        search={{ place: "", keyword: "retraite", pageIndex: 1 }}
      />,
    );

    expect(html).toContain("Résultats retraite 1");
  });

  it("invite à saisir quelque chose quand tout est vide", async () => {
    vi.mocked(resolvePlaceForRequest).mockResolvedValue({ status: "none" });

    const html = await renderToHtml(
      <PageSearchSection search={{ place: "", keyword: "", pageIndex: 1 }} />,
    );

    expect(html).toContain("Saisissez un lieu, un mot-clé, ou les deux");
    expect(html).not.toContain("Résultats");
  });

  it("signale un lieu inconnu et garde sa saisie", async () => {
    vi.mocked(resolvePlaceForRequest).mockResolvedValue({
      status: "unknown",
      input: "Nulle part",
    });

    const html = await renderToHtml(
      <PageSearchSection
        search={{ place: "Nulle part", keyword: "retraite", pageIndex: 1 }}
      />,
    );

    expect(html).toContain("Aucun lieu ne correspond à « Nulle part »");
    expect(html).toMatch(/<input[^>]*name="place"[^>]*value="Nulle part"/);
    expect(html).not.toContain("Résultats");
  });
});
