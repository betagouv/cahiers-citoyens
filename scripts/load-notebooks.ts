import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { eq, sql } from "drizzle-orm";
import { type Database, createDatabase } from "../src/db/client";
import { chunks, notebooks } from "../src/db/schema";
import { type Env, requireEnv } from "./args";
import { chunkTranscription } from "./chunk";

export interface NotebookMetadata {
  id: string;
  openedOn: string;
}

export interface LoadOptions {
  source: string;
  databaseUrl: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseManifestLine(
  text: string,
  lineNumber: number,
): NotebookMetadata {
  function failure(reason: string): Error {
    return new Error(`manifest.jsonl ligne ${lineNumber} : ${reason}`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw failure("JSON invalide");
  }
  if (!isObject(raw)) throw failure("objet attendu");
  const { id, openedOn } = raw;
  if (typeof id !== "string" || !/^notebook-\d+$/.test(id))
    throw failure(`id invalide (${String(id)})`);
  if (typeof openedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(openedOn)) {
    throw failure(`openedOn invalide (${String(openedOn)})`);
  }
  return { id, openedOn };
}

// Une ligne JSON par cahier ; les lignes vides sont ignorées.
export function parseManifest(manifest: string): NotebookMetadata[] {
  return manifest
    .split("\n")
    .map((line, i) => ({ line, lineNumber: i + 1 }))
    .filter(({ line }) => line.trim() !== "")
    .map(({ line, lineNumber }) => parseManifestLine(line, lineNumber));
}

export function parseLoadOptions(args: string[], env: Env): LoadOptions {
  const { values } = parseArgs({
    args,
    options: { source: { type: "string" } },
  });
  const source = values.source;
  if (!source)
    throw new Error("--source est obligatoire (ex. --source data/fake-data)");
  return { source, databaseUrl: requireEnv(env, "DATABASE_URL") };
}

// Insère ou met à jour le cahier et remplace ses chunks, dans une
// transaction : relancé, le chargement ne crée pas de doublons. Renvoie le
// nombre de chunks écrits.
export async function loadNotebook(
  db: Database,
  source: string,
  { id, openedOn }: NotebookMetadata,
): Promise<number> {
  const scanKey = `notebooks/${id}/scan.pdf`;
  const transcriptionKey = `notebooks/${id}/transcription.txt`;
  await access(join(source, scanKey));
  const transcription = await readFile(join(source, transcriptionKey), "utf8");
  const rows = chunkTranscription(transcription).map((content, i) => ({
    notebookId: id,
    position: i + 1,
    content,
  }));

  const fields = { openedOn, scanKey, transcriptionKey, transcription };
  await db.transaction(async (tx) => {
    await tx
      .insert(notebooks)
      .values({ id, ...fields })
      .onConflictDoUpdate({
        target: notebooks.id,
        set: { ...fields, importedAt: sql`now()` },
      });
    await tx.delete(chunks).where(eq(chunks.notebookId, id));
    if (rows.length > 0) await tx.insert(chunks).values(rows);
  });
  return rows.length;
}

export async function runLoad(
  args: string[],
  env: Env,
  log: (message: string) => void = console.log,
): Promise<void> {
  const { source, databaseUrl } = parseLoadOptions(args, env);
  const manifest = parseManifest(
    await readFile(join(source, "manifest.jsonl"), "utf8"),
  );
  const db = createDatabase(databaseUrl);
  try {
    let totalChunks = 0;
    for (const notebook of manifest) {
      totalChunks += await loadNotebook(db, source, notebook);
    }
    log(
      `${manifest.length} cahiers et ${totalChunks} chunks chargés depuis ${source}`,
    );
  } finally {
    await db.$client.end();
  }
}
