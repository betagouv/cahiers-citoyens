import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { composeNotebook } from "./compose";
import { toManifestLine } from "./domain";
import { createRandom } from "./random";
import { registerFonts, renderScan } from "./scan";
import { formatTranscription } from "./transcription";

const { values } = parseArgs({
  options: {
    count: { type: "string", default: "200" },
    out: { type: "string", default: "data/fake-data" },
    seed: { type: "string", default: "42" },
  },
});

const count = Number(values.count);
if (!Number.isInteger(count) || count < 1 || count > 9999) {
  throw new Error(
    `--count doit être un entier entre 1 et 9999 (reçu : ${values.count})`,
  );
}
const out = values.out;
const seed = values.seed;
const notebooksDir = join(out, "notebooks");

registerFonts(join(import.meta.dirname, "fonts"));
await mkdir(notebooksDir, { recursive: true });

const start = performance.now();
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
  if (index % 20 === 0 || index === count)
    console.log(`${index}/${count} cahiers`);
}
await writeFile(join(out, "manifest.jsonl"), `${manifest.join("\n")}\n`);

for (const entry of await readdir(notebooksDir)) {
  if (/^notebook-\d+$/.test(entry) && !expected.has(entry)) {
    await rm(join(notebooksDir, entry), { recursive: true });
  }
}

console.log(
  `${count} cahiers écrits dans ${out} en ${((performance.now() - start) / 1000).toFixed(1)} s`,
);
