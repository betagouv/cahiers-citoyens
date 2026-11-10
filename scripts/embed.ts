import { parseArgs } from "node:util";
import { asc, count, eq, isNull } from "drizzle-orm";
import { createDatabase } from "../src/db/client";
import { chunks } from "../src/db/schema";
import { createAlbertClient } from "../src/lib/albert";
import { parsePositiveInteger } from "./args";

const { values } = parseArgs({
  options: { batch: { type: "string" }, limit: { type: "string" } },
});
const batchSize = parsePositiveInteger("batch", values.batch, 32);
const limit = parsePositiveInteger(
  "limit",
  values.limit,
  Number.MAX_SAFE_INTEGER,
);
const databaseUrl = process.env.DATABASE_URL;
const apiKey = process.env.ALBERT_API_KEY;
if (!databaseUrl) throw new Error("DATABASE_URL est obligatoire");
if (!apiKey) throw new Error("ALBERT_API_KEY est obligatoire");

const albert = createAlbertClient({
  apiKey,
  baseUrl: process.env.ALBERT_BASE_URL,
});
const db = createDatabase(databaseUrl);
try {
  const [{ pending }] = await db
    .select({ pending: count() })
    .from(chunks)
    .where(isNull(chunks.embedding));
  const total = Math.min(pending, limit);
  console.log(`${pending} chunks sans embedding, ${total} à traiter`);

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
    console.log(`${done}/${total}`);
  }
  const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
  console.log(`${done} embeddings écrits en ${seconds} s`);
} finally {
  await db.$client.end();
}
