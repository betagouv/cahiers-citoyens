export const PIPELINE_RELEASE = "fake-2026.11";

export interface NotebookJsonPage {
  page: number;
  image: string;
  text: string;
}

export interface NotebookJson {
  format: 1;
  source_filename: string;
  pipeline_release: string;
  pages: NotebookJsonPage[];
}

export function imageName(page: number): string {
  return `${String(page).padStart(4, "0")}.png`;
}

export function buildNotebookJson(
  id: string,
  texts: readonly string[],
): NotebookJson {
  return {
    format: 1,
    source_filename: `${id}.pdf`,
    pipeline_release: PIPELINE_RELEASE,
    pages: texts.map((text, i) => ({
      page: i + 1,
      image: imageName(i + 1),
      text,
    })),
  };
}

export function serializeJson(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
}
