import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import postgres from "postgres";
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

const sql = postgres(urlBase, { onnotice: () => {} });
try {
  await sql
    .unsafe(
      await readFile(
        join(import.meta.dirname, "..", "db", "schema.sql"),
        "utf8",
      ),
    )
    .simple();

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
      cahier_id: id,
      ordre: i + 1,
      contenu,
    }));
    totalChunks += chunks.length;

    await sql.begin(async (tx) => {
      await tx`
        insert into cahiers ${tx({
          id,
          code_insee: commune.codeInsee,
          commune: commune.nom,
          departement: commune.departement,
          region: commune.region,
          date_ouverture: dateOuverture,
          cle_scan: cleScan,
          cle_transcription: cleTranscription,
          transcription,
        })}
        on conflict (id) do update set
          code_insee = excluded.code_insee,
          commune = excluded.commune,
          departement = excluded.departement,
          region = excluded.region,
          date_ouverture = excluded.date_ouverture,
          cle_scan = excluded.cle_scan,
          cle_transcription = excluded.cle_transcription,
          transcription = excluded.transcription,
          importe_le = now()
      `;
      await tx`delete from chunks where cahier_id = ${id}`;
      if (chunks.length > 0) await tx`insert into chunks ${tx(chunks)}`;
    });
  }
  console.log(
    `${cahiers.length} cahiers et ${totalChunks} chunks chargés depuis ${source}`,
  );
} finally {
  await sql.end();
}
