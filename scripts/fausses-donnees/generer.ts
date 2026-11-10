import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { composerCahier } from "./composer";
import { versLigneManifeste } from "./domaine";
import { creerHasard } from "./hasard";
import { enregistrerPolices, rendreScan } from "./scan";
import { formaterTranscription } from "./transcription";

const { values } = parseArgs({
  options: {
    nombre: { type: "string", default: "200" },
    sortie: { type: "string", default: "data/fausses-donnees" },
    graine: { type: "string", default: "42" },
  },
});

const nombre = Number(values.nombre);
if (!Number.isInteger(nombre) || nombre < 1 || nombre > 9999) {
  throw new Error(
    `--nombre doit être un entier entre 1 et 9999 (reçu : ${values.nombre})`,
  );
}
const sortie = values.sortie;
const graine = values.graine;
const dossierCahiers = join(sortie, "cahiers");

enregistrerPolices(join(import.meta.dirname, "polices"));
await mkdir(dossierCahiers, { recursive: true });

const debut = performance.now();
const manifeste: string[] = [];
const attendus = new Set<string>();
for (let numero = 1; numero <= nombre; numero++) {
  const cahier = composerCahier(
    numero,
    creerHasard(`${graine}:texte:${numero}`),
  );
  const dossier = join(dossierCahiers, cahier.id);
  await mkdir(dossier, { recursive: true });
  await writeFile(
    join(dossier, "transcription.txt"),
    formaterTranscription(cahier),
  );
  await writeFile(
    join(dossier, "scan.pdf"),
    await rendreScan(cahier, `${graine}:scan:${numero}`),
  );
  manifeste.push(JSON.stringify(versLigneManifeste(cahier)));
  attendus.add(cahier.id);
  if (numero % 20 === 0 || numero === nombre)
    console.log(`${numero}/${nombre} cahiers`);
}
await writeFile(join(sortie, "manifeste.jsonl"), `${manifeste.join("\n")}\n`);

for (const entree of await readdir(dossierCahiers)) {
  if (/^cahier-\d+$/.test(entree) && !attendus.has(entree)) {
    await rm(join(dossierCahiers, entree), { recursive: true });
  }
}

console.log(
  `${nombre} cahiers écrits dans ${sortie} en ${((performance.now() - debut) / 1000).toFixed(1)} s`,
);
