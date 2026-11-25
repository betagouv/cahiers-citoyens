import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatShare } from "@/lib/format";
import type { CorpusStats } from "@/lib/notebooks";
import { renderToHtml } from "@/test/render";
import { CorpusFigures } from "./corpus-figures";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(() => Promise.resolve()),
  getCorpusStats: vi.fn<() => Promise<CorpusStats>>(),
}));

vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("@/lib/notebooks", () => ({ getCorpusStats: mocks.getCorpusStats }));

const STATS: CorpusStats = {
  notebookCount: 12,
  chunkCount: 340,
  embeddedChunkCount: 170,
  firstOpenedOn: "2018-12-10",
  lastOpenedOn: "2019-02-20",
};

beforeEach(() => {
  mocks.connection.mockClear();
});

describe("CorpusFigures", () => {
  // Le séparateur avant « % » dépend de la version d'ICU : on le prend du formateur.
  it("affiche les quatre chiffres clés du corpus", async () => {
    mocks.getCorpusStats.mockResolvedValue(STATS);

    const html = await renderToHtml(<CorpusFigures />);

    expect(mocks.connection).toHaveBeenCalledOnce();
    const figures = [
      ...html.matchAll(
        /<p class="fr-h3[^"]*">([^<]*)<\/p><p class="fr-mb-0">([^<]*)</g,
      ),
    ].map(([, value, label]) => [value, label]);
    expect(figures).toEqual([
      ["12", "cahiers numérisés"],
      ["340", "contributions transcrites"],
      ["décembre 2018 – février 2019", "période d&#x27;ouverture des cahiers"],
      [formatShare(1, 2), "des contributions indexées pour la recherche"],
    ]);
  });

  it.each([
    { notebookCount: 0 },
    { firstOpenedOn: null },
    { lastOpenedOn: null },
  ])("annonce un corpus vide quand %o", async (override) => {
    mocks.getCorpusStats.mockResolvedValue({ ...STATS, ...override });

    expect(await renderToHtml(<CorpusFigures />)).toBe(
      "<p>Aucun cahier n&#x27;a encore été chargé.</p>",
    );
  });
});
