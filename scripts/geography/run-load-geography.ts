import { parseArgs } from "node:util";
import { type Database, createDatabase } from "../../src/db/client";
import { departments } from "../../src/db/schema";
import { errorMessage } from "../../src/ingestion/error-message";
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
  ifEmpty: boolean;
}

export function parseLoadGeographyOptions(
  args: string[],
  env: Env,
): LoadGeographyOptions {
  const { values } = parseArgs({
    args,
    options: {
      "movements-url": { type: "string" },
      "if-empty": { type: "boolean", default: false },
    },
  });
  return {
    databaseUrl: requireEnv(env, "DATABASE_URL"),
    movementsUrl: values["movements-url"] ?? MOVEMENTS_URL,
    ifEmpty: values["if-empty"],
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

async function withDatabase(
  url: string,
  work: (db: Database) => Promise<void>,
): Promise<void> {
  const db = createDatabase(url);
  try {
    await work(db);
  } finally {
    await db.$client.end();
  }
}

async function hasDepartments(db: Database): Promise<boolean> {
  const rows = await db
    .select({ code: departments.code })
    .from(departments)
    .limit(1);
  return rows.length > 0;
}

interface Loggers {
  log: (message: string) => void;
  warn: (message: string) => void;
}

// Postdeploy : une base déjà remplie est laissée telle quelle, et une source
// indisponible n'empêche pas le déploiement. Le référentiel reste vide
// jusqu'au prochain `db:seed`, l'erreur dans les logs l'annonce.
async function loadIfEmpty(
  { databaseUrl, movementsUrl }: LoadGeographyOptions,
  fetchImpl: Fetch,
  { log, warn }: Loggers,
): Promise<void> {
  await withDatabase(databaseUrl, async (db) => {
    if (await hasDepartments(db)) {
      log("departments contient déjà des lignes : rien à charger (--if-empty)");
      return;
    }
    let summary: Summary;
    try {
      summary = await fetchGeography(fetchImpl, movementsUrl);
    } catch (error) {
      warn(
        `Référentiel géographique non chargé, source indisponible : ${errorMessage(error)}. Relancer db:seed plus tard.`,
      );
      return;
    }
    await replaceGeography(db, summary.geography);
    log(describeSummary(summary));
  });
}

// Tout est téléchargé et vérifié avant d'ouvrir la base : une source invalide
// laisse le référentiel en place.
export async function runLoadGeography(
  args: string[],
  env: Env,
  fetchImpl: Fetch,
  log: (message: string) => void = console.log,
  warn: (message: string) => void = console.error,
): Promise<void> {
  const options = parseLoadGeographyOptions(args, env);
  if (options.ifEmpty) {
    await loadIfEmpty(options, fetchImpl, { log, warn });
    return;
  }
  const summary = await fetchGeography(fetchImpl, options.movementsUrl);
  await withDatabase(options.databaseUrl, (db) =>
    replaceGeography(db, summary.geography),
  );
  log(describeSummary(summary));
}
