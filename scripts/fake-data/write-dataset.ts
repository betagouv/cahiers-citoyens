import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { composeNotebook } from "./compose";
import { toManifestLine } from "./domain";
import type { GenerateArgs } from "./generate-args";
import { createRandom } from "./random";
import { renderScan } from "./scan-pdf";
import { formatTranscription } from "./transcription";

async function removeStaleNotebooks(
  notebooksDir: string,
  expected: ReadonlySet<string>,
): Promise<void> {
  for (const entry of await readdir(notebooksDir)) {
    if (/^notebook-\d+$/.test(entry) && !expected.has(entry)) {
      await rm(join(notebooksDir, entry), { recursive: true });
    }
  }
}

export async function writeDataset(
  { count, out, seed }: GenerateArgs,
  log: (message: string) => void,
): Promise<void> {
  const notebooksDir = join(out, "notebooks");
  await mkdir(notebooksDir, { recursive: true });

  const manifest: string[] = [];
  const expected = new Set<string>();
  for (let index = 1; index <= count; index++) {
    // Les étiquettes « texte » et « scan » font partie de la graine : les changer
    // change tous les cahiers générés.
    const notebook = composeNotebook(
      index,
      createRandom(`${seed}:texte:${index}`),
    );
    const dir = join(notebooksDir, notebook.id);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "transcription.txt"),
      formatTranscription(notebook),
    );
    await writeFile(
      join(dir, "scan.pdf"),
      await renderScan(notebook, `${seed}:scan:${index}`),
    );
    manifest.push(JSON.stringify(toManifestLine(notebook)));
    expected.add(notebook.id);
    log(`${index}/${count} cahiers`);
  }
  await writeFile(join(out, "manifest.jsonl"), `${manifest.join("\n")}\n`);
  await removeStaleNotebooks(notebooksDir, expected);
}
