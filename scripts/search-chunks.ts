import { parseArgs } from "node:util";
import { asc, cosineDistance, isNotNull } from "drizzle-orm";
import { type Database, createDatabase } from "../src/db/client";
import { chunks } from "../src/db/schema";
import { createAlbertClient } from "../src/lib/albert";
import { type Env, parsePositiveInteger, requireEnv } from "./args";

export interface SearchOptions {
  question: string;
  limit: number;
  databaseUrl: string;
  apiKey: string;
  albertBaseUrl: string | undefined;
}

export interface NearestChunk {
  distance: unknown;
  notebookId: string;
  content: string;
}

export function parseSearchOptions(args: string[], env: Env): SearchOptions {
  const { values, positionals } = parseArgs({
    args,
    options: { limit: { type: "string" } },
    allowPositionals: true,
  });
  const question = positionals.join(" ").trim();
  const limit = parsePositiveInteger("limit", values.limit, 5);
  if (question === "") {
    throw new Error('Usage : bun scripts/search.ts "question" [--limit 5]');
  }
  return {
    question,
    limit,
    databaseUrl: requireEnv(env, "DATABASE_URL"),
    apiKey: requireEnv(env, "ALBERT_API_KEY"),
    albertBaseUrl: env.ALBERT_BASE_URL,
  };
}

export async function nearestChunks(
  db: Database,
  questionVector: number[],
  limit: number,
): Promise<NearestChunk[]> {
  const distance = cosineDistance(chunks.embedding, questionVector);
  return db
    .select({
      distance,
      notebookId: chunks.notebookId,
      content: chunks.content,
    })
    .from(chunks)
    .where(isNotNull(chunks.embedding))
    .orderBy(asc(distance))
    .limit(limit);
}

// « distance  cahier  début du texte », sur une ligne.
export function formatNearestChunk({
  distance,
  notebookId,
  content,
}: NearestChunk): string {
  const excerpt = content.replace(/\s+/g, " ").slice(0, 120);
  return `${Number(distance).toFixed(4)}  ${notebookId}  ${excerpt}`;
}

export async function runSearch(
  args: string[],
  env: Env,
  log: (message: string) => void = console.log,
): Promise<void> {
  const options = parseSearchOptions(args, env);
  const albert = createAlbertClient({
    apiKey: options.apiKey,
    baseUrl: options.albertBaseUrl,
  });
  const [questionVector] = await albert.embed([options.question]);
  const db = createDatabase(options.databaseUrl);
  try {
    const results = await nearestChunks(db, questionVector, options.limit);
    for (const result of results) log(formatNearestChunk(result));
  } finally {
    await db.$client.end();
  }
}
