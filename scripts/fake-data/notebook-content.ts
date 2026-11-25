import type { NotebookSpec } from "./delivery-plan";
import {
  correctMunicipality,
  correctText,
  stampCorrection,
} from "./notebook-change";
import type { NotebookContent } from "./notebook-json";
import { encodePage, type PageImage } from "./page-image";
import { pageNumbers } from "./page-numbers";
import { createRandom } from "./random";
import { renderPages, type WrittenLine } from "./scan";

interface RenderedPage {
  lines: WrittenLine[];
  image: PageImage;
}

function correctFirstLine(lines: WrittenLine[]): WrittenLine[] {
  return lines.map((line, i) =>
    i === 0 ? { ...line, text: correctText(line.text) } : line,
  );
}

// La première page n'est jamais blanche : les pages blanches s'insèrent après une page écrite.
export async function renderNotebookContent(
  spec: NotebookSpec,
  seed: string,
): Promise<NotebookContent> {
  const pages: RenderedPage[] = [];
  for await (const { canvas, lines } of renderPages(
    spec.notebook,
    `${seed}:scan:${spec.index}`,
    createRandom(`${seed}:blank:${spec.index}`),
  )) {
    const first = pages.length === 0;
    if (first && spec.change === "image") stampCorrection(canvas);
    pages.push({
      lines: first && spec.change === "text" ? correctFirstLine(lines) : lines,
      image: await encodePage(canvas, spec.imageStyle),
    });
  }
  const numbers = pageNumbers(
    pages.length,
    spec.gaps ? createRandom(`${seed}:gaps:${spec.index}`) : null,
  );
  const { metadata } = spec;
  return {
    id: spec.id,
    metadata:
      spec.change === "metadata"
        ? { ...metadata, commune: correctMunicipality(metadata.commune) }
        : metadata,
    pages: pages.map((page, i) => ({ number: numbers[i], ...page })),
  };
}
