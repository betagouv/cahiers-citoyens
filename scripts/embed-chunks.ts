import { parseArgs } from "node:util";
import { asc, count, eq, isNull } from "drizzle-orm";
import { type Database, createDatabase } from "../src/db/client";
import { chunks } from "../src/db/schema";
import { type AlbertClient, createAlbertClient } from "../src/lib/albert";
import { type Env, parsePositiveInteger, requireEnv } from "./args";

export interface EmbedOptions {
  batchSize: number;
  limit: number;
  databaseUrl: string;
  apiKey: string;
  albertBaseUrl: string | undefined;
}

type Log = (message: string) => void;

export function parseEmbedOptions(args: string[], env: Env): EmbedOptions {
  const { values } = parseArgs({
    args,
    options: { batch: { type: "string" }, limit: { type: "string" } },
  });
  return {
    batchSize: parsePositiveInteger("batch", values.batch, 32),
    limit: parsePositiveInteger("limit", values.limit, Number.MAX_SAFE_INTEGER),
    databaseUrl: requireEnv(env, "DATABASE_URL"),
    apiKey: requireEnv(env, "ALBERT_API_KEY"),
    albertBaseUrl: env.ALBERT_BASE_URL,
  };
}

// Vectorise par lots les chunks sans embedding, au plus `limit`, en affichant
// la progression. Relancé, ne refait rien.
export async function embedPendingChunks(
  db: Database,
  albert: Pick<AlbertClient, "embed">,
  { batchSize, limit }: Pick<EmbedOptions, "batchSize" | "limit">,
  log: Log,
): Promise<void> {
  const [{ pending }] = await db
    .select({ pending: count() })
    .from(chunks)
    .where(isNull(chunks.embedding));
  const total = Math.min(pending, limit);
  log(`${pending} chunks sans embedding, ${total} à traiter`);

  const startedAt = performance.now();
  let done = 0;
  while (done < total) {
    const batch = await db
      .select({ id: chunks.id, content: chunks.content })
      .from(chunks)
      .where(isNull(chunks.embedding))
      .orderBy(asc(chunks.id))
      .limit(Math.min(batchSize, total - done));
    if (batch.length === 0) break;

    const vectors = await albert.embed(batch.map((chunk) => chunk.content));
    await db.transaction(async (tx) => {
      for (const [i, chunk] of batch.entries()) {
        await tx
          .update(chunks)
          .set({ embedding: vectors[i] })
          .where(eq(chunks.id, chunk.id));
      }
    });
    done += batch.length;
    log(`${done}/${total}`);
  }
  const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
  log(`${done} embeddings écrits en ${seconds} s`);
}

export async function runEmbed(
  args: string[],
  env: Env,
  log: Log = console.log,
): Promise<void> {
  const options = parseEmbedOptions(args, env);
  const albert = createAlbertClient({
    apiKey: options.apiKey,
    baseUrl: options.albertBaseUrl,
  });
  const db = createDatabase(options.databaseUrl);
  try {
    await embedPendingChunks(db, albert, options, log);
  } finally {
    await db.$client.end();
  }
}
