import { parseArgs } from "node:util";
import { asc, cosineDistance, isNotNull } from "drizzle-orm";
import { createDatabase } from "../src/db/client";
import { chunks } from "../src/db/schema";
import { createAlbertClient } from "../src/lib/albert";
import { parsePositiveInteger } from "./args";

const { values, positionals } = parseArgs({
  options: { limit: { type: "string" } },
  allowPositionals: true,
});
const question = positionals.join(" ").trim();
const limit = parsePositiveInteger("limit", values.limit, 5);
const databaseUrl = process.env.DATABASE_URL;
const apiKey = process.env.ALBERT_API_KEY;
if (question === "") {
  throw new Error('Usage : bun scripts/search.ts "question" [--limit 5]');
}
if (!databaseUrl) throw new Error("DATABASE_URL est obligatoire");
if (!apiKey) throw new Error("ALBERT_API_KEY est obligatoire");

const albert = createAlbertClient({
  apiKey,
  baseUrl: process.env.ALBERT_BASE_URL,
});
const [questionVector] = await albert.embed([question]);
const db = createDatabase(databaseUrl);
try {
  const distance = cosineDistance(chunks.embedding, questionVector);
  const results = await db
    .select({
      distance,
      notebookId: chunks.notebookId,
      content: chunks.content,
    })
    .from(chunks)
    .where(isNotNull(chunks.embedding))
    .orderBy(asc(distance))
    .limit(limit);
  for (const { distance, notebookId, content } of results) {
    const excerpt = content.replace(/\s+/g, " ").slice(0, 120);
    console.log(`${Number(distance).toFixed(4)}  ${notebookId}  ${excerpt}`);
  }
} finally {
  await db.$client.end();
}
