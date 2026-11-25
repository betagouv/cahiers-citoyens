import type { NotebookSpec } from "./delivery-plan";
import { correctText, stampCorrection } from "./notebook-change";
import type { NotebookContent, NotebookPage } from "./notebook-draft";
import { createRandom } from "./random";
import { renderPages } from "./scan";

// La première page n'est jamais blanche : les pages blanches s'insèrent après une page écrite.
export async function renderNotebookContent(
  spec: NotebookSpec,
  seed: string,
): Promise<NotebookContent> {
  const pages: NotebookPage[] = [];
  for await (const { canvas, text } of renderPages(
    spec.notebook,
    `${seed}:scan:${spec.index}`,
    createRandom(`${seed}:blank:${spec.index}`),
  )) {
    const first = pages.length === 0;
    if (first && spec.change === "image") stampCorrection(canvas);
    pages.push({
      text: first && spec.change === "text" ? correctText(text) : text,
      png: await canvas.encode("png"),
    });
  }
  return { id: spec.id, pages };
}
