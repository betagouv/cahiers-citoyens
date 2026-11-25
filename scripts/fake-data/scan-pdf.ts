import { PDFDocument } from "pdf-lib";
import type { Notebook } from "./domain";
import { renderPages } from "./scan";

const JPEG_QUALITY = 65;
const A4_POINTS: [number, number] = [595.28, 841.89];

export async function renderScan(
  notebook: Notebook,
  seed: string,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create({ updateMetadata: false });
  for await (const { canvas } of renderPages(notebook, seed)) {
    const jpeg = await canvas.encode("jpeg", JPEG_QUALITY);
    const image = await pdf.embedJpg(jpeg);
    pdf.addPage(A4_POINTS).drawImage(image, {
      x: 0,
      y: 0,
      width: A4_POINTS[0],
      height: A4_POINTS[1],
    });
  }
  return pdf.save();
}
