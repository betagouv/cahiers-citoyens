import { parseArgs } from "node:util";
import { createDatabase } from "../../src/db/client";
import { type Env, requireEnv } from "../args";
import { resolveCodeHistory } from "./code-history";
import { type Fetch, fetchJson, fetchText } from "./fetch-source";
import { parseDepartments, parseMunicipalities } from "./geo-api";
import { parseMovements } from "./movements";
import { type Geography, replaceGeography } from "./store-geography";

export const DEPARTMENTS_URL = "https://geo.api.gouv.fr/departements";
export const MUNICIPALITIES_URL =
  "https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,codeDepartement,population&format=json";
// Événements survenus aux communes, COG millésime 2026 de l'Insee (aussi
// référencé sur data.gouv.fr). L'adresse change à chaque millésime :
// `--movements-url` permet de passer au suivant sans toucher au code.
export const MOVEMENTS_URL =
  "https://www.insee.fr/fr/statistiques/fichier/8740222/v_mvt_commune_2026.csv";

export interface LoadGeographyOptions {
  databaseUrl: string;
  movementsUrl: string;
}

export function parseLoadGeographyOptions(
  args: string[],
  env: Env,
): LoadGeographyOptions {
  const { values } = parseArgs({
    args,
    options: { "movements-url": { type: "string" } },
  });
  return {
    databaseUrl: requireEnv(env, "DATABASE_URL"),
    movementsUrl: values["movements-url"] ?? MOVEMENTS_URL,
  };
}

interface Summary {
  geography: Geography;
  unresolved: string[];
}

export async function fetchGeography(
  fetchImpl: Fetch,
  movementsUrl: string,
): Promise<Summary> {
  const [rawDepartments, rawMunicipalities, movementsCsv] = await Promise.all([
    fetchJson(fetchImpl, DEPARTMENTS_URL),
    fetchJson(fetchImpl, MUNICIPALITIES_URL),
    fetchText(fetchImpl, movementsUrl),
  ]);
  const municipalities = parseMunicipalities(rawMunicipalities);
  const { changes, unresolved } = resolveCodeHistory(
    parseMovements(movementsCsv),
    new Set(municipalities.map(({ inseeCode }) => inseeCode)),
  );
  return {
    geography: {
      departments: parseDepartments(rawDepartments),
      municipalities,
      codeChanges: changes,
    },
    unresolved,
  };
}

function describeSummary({ geography, unresolved }: Summary): string {
  const counts = `${geography.departments.length} départements, ${geography.municipalities.length} communes, ${geography.codeChanges.length} anciens codes`;
  if (unresolved.length === 0) return `${counts} chargés`;
  return `${counts} chargés ; sans commune actuelle : ${unresolved.join(", ")}`;
}

// Tout est téléchargé et vérifié avant d'ouvrir la base : une source invalide
// laisse le référentiel en place.
export async function runLoadGeography(
  args: string[],
  env: Env,
  fetchImpl: Fetch,
  log: (message: string) => void = console.log,
): Promise<void> {
  const { databaseUrl, movementsUrl } = parseLoadGeographyOptions(args, env);
  const summary = await fetchGeography(fetchImpl, movementsUrl);
  const db = createDatabase(databaseUrl);
  try {
    await replaceGeography(db, summary.geography);
  } finally {
    await db.$client.end();
  }
  log(describeSummary(summary));
}
