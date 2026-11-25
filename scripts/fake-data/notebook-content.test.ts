import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { composeNotebook } from "./compose";
import { registerFonts } from "./hands";
import { correctMunicipality, correctText } from "./notebook-change";
import { renderNotebookContent } from "./notebook-content";
import { createRandom } from "./random";
import { testSpec } from "./test-notebook";

const JPEG = [0xff, 0xd8, 0xff];

beforeAll(() => registerFonts(join(import.meta.dirname, "fonts")));

describe("renderNotebookContent", () => {
  it(
    "rend chaque page en image avec ses lignes, et applique la modification demandée",
    { timeout: 30_000 },
    async () => {
      const base = await renderNotebookContent(testSpec(), "42");
      expect(base.id).toBe("CC_76600_190101_76351_MD_10001");
      expect(base.metadata).toEqual(testSpec().metadata);
      expect(base.pages.map(({ number }) => number)).toEqual([1]);
      const [page] = base.pages;
      expect(page.image.extension).toBe("png");
      expect(Array.from(page.image.bytes.subarray(0, 3))).toEqual(JPEG);
      expect(page.lines.map(({ text }) => text).join(" ")).toContain(
        "Un médecin au village.",
      );

      const text = await renderNotebookContent(
        testSpec({ change: "text" }),
        "42",
      );
      expect(text.pages[0].image).toEqual(page.image);
      expect(text.pages[0].lines[0].text).toBe(correctText(page.lines[0].text));
      expect(text.pages[0].lines.slice(1)).toEqual(page.lines.slice(1));

      const image = await renderNotebookContent(
        testSpec({ change: "image" }),
        "42",
      );
      expect(image.pages[0].lines).toEqual(page.lines);
      expect(
        Buffer.from(image.pages[0].image.bytes).equals(page.image.bytes),
      ).toBe(false);

      const metadata = await renderNotebookContent(
        testSpec({ change: "metadata" }),
        "42",
      );
      expect(metadata.pages).toEqual(base.pages);
      expect(metadata.metadata).toEqual({
        ...base.metadata,
        commune: correctMunicipality("Le Havre"),
      });
    },
  );

  it(
    "laisse des trous dans la numérotation quand on le demande",
    { timeout: 30_000 },
    async () => {
      const notebook = composeNotebook(3, createRandom("scan:3"));
      const spec = testSpec({ notebook, gaps: true, imageStyle: "jpg" });
      const { pages } = await renderNotebookContent(spec, "1");
      expect(pages.map(({ number }) => number)).toEqual([1, 5]);
      expect(pages[0].image.extension).toBe("jpg");
    },
  );
});
