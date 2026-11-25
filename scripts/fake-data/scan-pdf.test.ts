import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";
import { registerFonts } from "./hands";
import { renderScan } from "./scan-pdf";
import { shortNotebook } from "./test-notebook";

beforeAll(() => registerFonts(join(import.meta.dirname, "fonts")));

describe("renderScan", () => {
  it("assemble les pages en un PDF A4, identique pour la même graine", async () => {
    const pdf = await renderScan(shortNotebook(), "pdf");
    const document = await PDFDocument.load(pdf);
    expect(document.getPageCount()).toBe(1);
    const { width, height } = document.getPage(0).getSize();
    expect([Math.round(width), Math.round(height)]).toEqual([595, 842]);
    expect(Buffer.from(await renderScan(shortNotebook(), "pdf"))).toEqual(
      Buffer.from(pdf),
    );
  });
});
