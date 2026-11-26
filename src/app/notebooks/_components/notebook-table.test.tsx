import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotebookPage } from "@/lib/notebooks";
import { renderToHtml } from "@/test/render";
import { NotebookTable } from "./notebook-table";

const listNotebooks = vi.hoisted(() =>
  vi.fn<(page: number) => Promise<NotebookPage>>(),
);

vi.mock("@/lib/notebooks", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/notebooks")>()),
  listNotebooks,
}));

const NOTEBOOK = { id: "notebook-0001", openedOn: "2019-01-15", chunkCount: 7 };

function render(page?: string): Promise<string> {
  return renderToHtml(
    <NotebookTable searchParams={Promise.resolve({ page })} />,
  );
}

beforeEach(() => {
  listNotebooks.mockReset();
});

describe("NotebookTable", () => {
  it("liste les cahiers de la page avec un lien vers chacun", async () => {
    listNotebooks.mockResolvedValue({
      notebooks: [NOTEBOOK],
      page: 1,
      pageCount: 1,
      total: 1,
    });

    const html = await render();

    expect(listNotebooks).toHaveBeenCalledWith(1);
    expect(html).toContain("<p>1 cahiers, page 1 sur 1.</p>");
    expect(html).toContain(
      '<a href="/notebooks/notebook-0001">notebook-0001</a>',
    );
    expect(html).toContain("15 janvier 2019");
    expect(html).not.toContain("fr-pagination");
  });

  it("signale la date d'ouverture d'un cahier venu d'un dépôt", async () => {
    listNotebooks.mockResolvedValue({
      notebooks: [{ ...NOTEBOOK, openedOn: null }],
      page: 1,
      pageCount: 1,
      total: 1,
    });

    expect(await render()).toContain("Non renseignée");
  });

  it("demande la page de l'URL et pagine quand il y en a plusieurs", async () => {
    listNotebooks.mockResolvedValue({
      notebooks: [NOTEBOOK],
      page: 2,
      pageCount: 3,
      total: 41,
    });

    const html = await render("2");

    expect(listNotebooks).toHaveBeenCalledWith(2);
    expect(html).toContain("<p>41 cahiers, page 2 sur 3.</p>");
    expect(html).toContain("fr-pagination");
    expect(html).toContain('href="/notebooks?page=3"');
  });

  it("annonce qu'aucun cahier n'est chargé", async () => {
    listNotebooks.mockResolvedValue({
      notebooks: [],
      page: 1,
      pageCount: 1,
      total: 0,
    });

    expect(await render("abc")).toBe(
      "<p>Aucun cahier n&#x27;a encore été chargé.</p>",
    );
    expect(listNotebooks).toHaveBeenCalledWith(1);
  });
});
