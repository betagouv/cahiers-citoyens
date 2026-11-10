import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { decouper } from "./decouper";
import type { Commune } from "./fausses-donnees/domaine";

interface MetadonneesCahier {
  id: string;
  commune: Commune;
  dateOuverture: string;
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null;
}

function lireLigneManifeste(texte: string, numero: number): MetadonneesCahier {
  function echec(raison: string): Error {
    return new Error(`manifeste.jsonl ligne ${numero} : ${raison}`);
  }
  function texteCommune(
    commune: Record<string, unknown>,
    champ: keyof Commune,
  ): string {
    const valeur = commune[champ];
    if (typeof valeur !== "string" || valeur === "")
      throw echec(`commune.${champ} manquant`);
    return valeur;
  }
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw echec("JSON invalide");
  }
  if (!estObjet(brut)) throw echec("objet attendu");
  const { id, commune, dateOuverture } = brut;
  if (typeof id !== "string" || !/^cahier-\d+$/.test(id))
    throw echec(`id invalide (${String(id)})`);
  if (
    typeof dateOuverture !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateOuverture)
  ) {
    throw echec(`dateOuverture invalide (${String(dateOuverture)})`);
  }
  if (!estObjet(commune)) throw echec("commune manquante");
  return {
    id,
    dateOuverture,
    commune: {
      nom: texteCommune(commune, "nom"),
      codeInsee: texteCommune(commune, "codeInsee"),
      departement: texteCommune(commune, "departement"),
      region: texteCommune(commune, "region"),
    },
  };
}

const { values } = parseArgs({ options: { source: { type: "string" } } });
const source = values.source;
const urlBase = process.env.DATABASE_URL;
if (!source)
  throw new Error(
    "--source est obligatoire (ex. --source data/fausses-donnees)",
  );
if (!urlBase) throw new Error("DATABASE_URL est obligatoire");

const manifeste = await readFile(join(source, "manifeste.jsonl"), "utf8");
const cahiers = manifeste
  .split("\n")
  .map((ligne, i) => ({ ligne, numero: i + 1 }))
  .filter(({ ligne }) => ligne.trim() !== "")
  .map(({ ligne, numero }) => lireLigneManifeste(ligne, numero));

const prisma = new PrismaClient({ adapter: new PrismaPg(urlBase) });
try {
  let totalChunks = 0;
  for (const { id, commune, dateOuverture } of cahiers) {
    const cleScan = `cahiers/${id}/scan.pdf`;
    const cleTranscription = `cahiers/${id}/transcription.txt`;
    await access(join(source, cleScan));
    const transcription = await readFile(
      join(source, cleTranscription),
      "utf8",
    );
    const chunks = decouper(transcription).map((contenu, i) => ({
      cahierId: id,
      ordre: i + 1,
      contenu,
    }));
    totalChunks += chunks.length;

    const champs = {
      codeInsee: commune.codeInsee,
      commune: commune.nom,
      departement: commune.departement,
      region: commune.region,
      dateOuverture: new Date(`${dateOuverture}T00:00:00Z`),
      cleScan,
      cleTranscription,
      transcription,
    };
    await prisma.$transaction([
      prisma.cahier.upsert({
        where: { id },
        create: { id, ...champs },
        update: { ...champs, importeLe: new Date() },
      }),
      prisma.chunk.deleteMany({ where: { cahierId: id } }),
      prisma.chunk.createMany({ data: chunks }),
    ]);
  }
  console.log(
    `${cahiers.length} cahiers et ${totalChunks} chunks chargés depuis ${source}`,
  );
} finally {
  await prisma.$disconnect();
}
