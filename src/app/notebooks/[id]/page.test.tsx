import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notebook } from "@/lib/notebooks";
import { renderToHtml } from "@/test/render";
import NotebookPage, { generateMetadata } from "./page";

const getNotebook = vi.hoisted(() =>
  vi.fn<(id: string) => Promise<Notebook | undefined>>(),
);

vi.mock("@/lib/notebooks", () => ({ getNotebook }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(),
}));

const NOTEBOOK: Notebook = {
  id: "CC_1",
  onlineVersion: 2,
  municipalityName: "Exempleville",
  departmentName: "Ain",
  departmentCode: "01",
  pages: [
    { number: 1, width: 1200, height: 1700, text: "Première page" },
    { number: 2, width: 1200, height: 1700, text: "Seconde page" },
  ],
};

function props(id: string) {
  return {
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve({}),
  };
}

beforeEach(() => {
  getNotebook.mockReset();
});

describe("generateMetadata", () => {
  it("titre et décrit la page par la commune du cahier", async () => {
    getNotebook.mockResolvedValue(NOTEBOOK);

    expect(await generateMetadata(props("CC_1"))).toEqual({
      title: "Exempleville (01) : cahier citoyen",
      description:
        "Exempleville (01) : cahier citoyen. 2 pages en image, chacune avec sa transcription.",
    });
  });

  it("se rabat sur l'identifiant d'un cahier introuvable", async () => {
    getNotebook.mockResolvedValue(undefined);

    expect(await generateMetadata(props("CC_9"))).toEqual({
      title: "Cahier CC_9",
    });
  });
});

describe("NotebookPage", () => {
  it("affiche chaque page avec son image et sa transcription", async () => {
    getNotebook.mockResolvedValue(NOTEBOOK);

    const html = await renderToHtml(await NotebookPage(props("CC_1")));

    expect(getNotebook).toHaveBeenCalledWith("CC_1");
    expect(html).toContain("<h1>Exempleville (01) : cahier citoyen</h1>");
    expect(html).toContain("Ain · 2 pages");
    expect(html).toContain("Identifiant du cahier : CC_1");
    expect(html).toContain("Aller à une page");
    expect(html).toContain('id="page-1"');
    expect(html).toContain('src="/notebooks/CC_1/pages/2?v=2"');
    expect(html).toContain("Seconde page");
  });

  it("n'affiche pas l'index pour une seule page", async () => {
    getNotebook.mockResolvedValue({
      ...NOTEBOOK,
      departmentName: null,
      pages: [NOTEBOOK.pages[0]],
    });

    const html = await renderToHtml(await NotebookPage(props("CC_1")));

    expect(html).toContain('<p class="fr-text--lead fr-mb-1w">1 page</p>');
    expect(html).not.toContain("Aller à une page");
  });

  it("signale un cahier chargé avant les dépôts, sans pages", async () => {
    getNotebook.mockResolvedValue({
      ...NOTEBOOK,
      municipalityName: null,
      departmentName: null,
      departmentCode: null,
      onlineVersion: null,
      pages: [],
    });

    const html = await renderToHtml(await NotebookPage(props("notebook-0001")));

    expect(html).toContain("<h1>Cahier CC_1</h1>");
    expect(html).toContain(
      "Les pages de ce cahier ne sont pas encore en ligne.",
    );
    expect(html).not.toContain("<img");
  });

  it("renvoie la page 404 pour un cahier retiré entre-temps", async () => {
    getNotebook.mockResolvedValue(undefined);

    await expect(NotebookPage(props("CC_9"))).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });
});
