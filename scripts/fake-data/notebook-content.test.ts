import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { NotebookChange, NotebookSpec } from "./delivery-plan";
import { registerFonts } from "./hands";
import { correctText } from "./notebook-change";
import { renderNotebookContent } from "./notebook-content";
import { shortNotebook } from "./test-notebook";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function spec(change: NotebookChange): NotebookSpec {
  return {
    index: 1,
    id: "CC_1",
    notebook: shortNotebook(),
    change,
    defects: [],
  };
}

beforeAll(() => registerFonts(join(import.meta.dirname, "fonts")));

describe("renderNotebookContent", () => {
  it(
    "rend une image PNG et le texte de chaque page",
    { timeout: 30_000 },
    async () => {
      const base = await renderNotebookContent(spec("none"), "42");
      expect(base.id).toBe("CC_1");
      expect(base.pages).toHaveLength(1);
      expect(Array.from(base.pages[0].png.subarray(0, 8))).toEqual(
        PNG_SIGNATURE,
      );
      expect(base.pages[0].text).toContain("Un médecin au village.");

      const text = await renderNotebookContent(spec("text"), "42");
      expect(text.pages[0].png).toEqual(base.pages[0].png);
      expect(text.pages[0].text).toBe(correctText(base.pages[0].text));

      const image = await renderNotebookContent(spec("image"), "42");
      expect(image.pages[0].text).toBe(base.pages[0].text);
      expect(Buffer.from(image.pages[0].png).equals(base.pages[0].png)).toBe(
        false,
      );
    },
  );
});
