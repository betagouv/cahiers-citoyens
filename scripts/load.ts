import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { eq, sql } from "drizzle-orm";
import { createDatabase } from "../src/db/client";
import { chunks, notebooks } from "../src/db/schema";
import { chunkTranscription } from "./chunk";

interface NotebookMetadata {
  id: string;
  openedOn: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseManifestLine(text: string, lineNumber: number): NotebookMetadata {
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

const { values } = parseArgs({ options: { source: { type: "string" } } });
const source = values.source;
const databaseUrl = process.env.DATABASE_URL;
if (!source)
  throw new Error("--source est obligatoire (ex. --source data/fake-data)");
if (!databaseUrl) throw new Error("DATABASE_URL est obligatoire");

const manifest = await readFile(join(source, "manifest.jsonl"), "utf8");
const manifestNotebooks = manifest
  .split("\n")
  .map((line, i) => ({ line, lineNumber: i + 1 }))
  .filter(({ line }) => line.trim() !== "")
  .map(({ line, lineNumber }) => parseManifestLine(line, lineNumber));

const db = createDatabase(databaseUrl);
try {
  let totalChunks = 0;
  for (const { id, openedOn } of manifestNotebooks) {
    const scanKey = `notebooks/${id}/scan.pdf`;
    const transcriptionKey = `notebooks/${id}/transcription.txt`;
    await access(join(source, scanKey));
    const transcription = await readFile(
      join(source, transcriptionKey),
      "utf8",
    );
    const rows = chunkTranscription(transcription).map((content, i) => ({
      notebookId: id,
      position: i + 1,
      content,
    }));
    totalChunks += rows.length;

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
  }
  console.log(
    `${manifestNotebooks.length} cahiers et ${totalChunks} chunks chargés depuis ${source}`,
  );
} finally {
  await db.$client.end();
}
