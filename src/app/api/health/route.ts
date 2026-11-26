import { connection } from "next/server";
import { getDatabase } from "@/db/client";
import { readIngestHealth } from "@/lib/health/ingest-health";

const NO_STORE = { "cache-control": "no-store" };

// Santé du site et du job d'ingestion, pour l'outil de supervision. `degraded`
// répond 200 : le site sert ses pages, seul le job est en retard. Sans base,
// 503 sans détail : le message d'erreur reste dans les logs du serveur.
export async function GET() {
  await connection();
  try {
    const health = await readIngestHealth(getDatabase(), new Date());
    return Response.json(health, { headers: NO_STORE });
  } catch (error) {
    console.error("Santé : base injoignable", error);
    return Response.json(
      { status: "error" },
      { status: 503, headers: NO_STORE },
    );
  }
}
