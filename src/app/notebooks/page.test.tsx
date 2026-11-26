import { describe, expect, it, vi } from "vitest";
import { renderToHtml } from "@/test/render";
import NotebooksPage, { metadata } from "./page";

vi.mock("@/lib/notebooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/notebooks")>()),
  listNotebooks: () =>
    Promise.resolve({
      notebooks: [
        {
          id: "CC_1",
          municipalityName: null,
          departmentName: null,
          departmentCode: null,
          pageCount: 7,
        },
      ],
      page: 1,
      pageCount: 1,
      total: 1,
    }),
}));

describe("NotebooksPage", () => {
  it("affiche le fil d'Ariane, le titre et la table des cahiers", async () => {
    const html = await renderToHtml(
      <NotebooksPage
        params={Promise.resolve({})}
        searchParams={Promise.resolve({})}
      />,
    );

    expect(metadata).toEqual({ title: "Les cahiers" });
    expect(html).toContain("fr-breadcrumb");
    expect(html).toContain("<h1>Les cahiers</h1>");
    expect(html).toContain('href="/notebooks/CC_1"');
    expect(html).not.toContain("Chargement des cahiers");
  });
});
