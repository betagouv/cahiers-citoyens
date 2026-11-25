import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notebook } from "@/lib/notebooks";
import { renderToHtml } from "@/test/render";
import NotebookPage, { generateMetadata } from "./page";

const getNotebook = vi.hoisted(() =>
  vi.fn<(id: string) => Promise<Notebook | undefined>>(),
);

vi.mock("@/lib/notebooks", () => ({ getNotebook }));

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
  it("titre la page avec l'identifiant du cahier", async () => {
    expect(await generateMetadata(props("notebook-0001"))).toEqual({
      title: "Cahier notebook-0001",
    });
  });
});

describe("NotebookPage", () => {
  it("affiche le scan et la transcription du cahier", async () => {
    getNotebook.mockResolvedValue({
      id: "notebook-0001",
      openedOn: "2019-01-15",
      transcription: "Texte du cahier",
      chunkCount: 4,
    });

    const html = await renderToHtml(await NotebookPage(props("notebook-0001")));

    expect(getNotebook).toHaveBeenCalledWith("notebook-0001");
    expect(html).toContain("<h1>Cahier notebook-0001</h1>");
    expect(html).toContain(
      "Ouvert le 15 janvier 2019 · 4 passages indexés pour la recherche",
    );
    expect(html).toContain('src="/notebooks/notebook-0001/scan"');
    expect(html).toContain("Texte du cahier");
  });

  it("renvoie la page 404 pour un cahier supprimé entre-temps", async () => {
    getNotebook.mockResolvedValue(undefined);

    await expect(NotebookPage(props("notebook-9999"))).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });
});
