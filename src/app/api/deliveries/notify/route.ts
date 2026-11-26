import { after } from "next/server";
import { runIngestJob } from "@/ingestion/ingest-job";
import { hasBearerToken } from "@/lib/delivery-notify/bearer-token";
import { createThrottle } from "@/lib/delivery-notify/throttle";

// Un passage au plus toutes les 30 s, quel que soit le nombre d'appels.
export const NOTIFY_INTERVAL_MS = 30_000;

const throttle = createThrottle(NOTIFY_INTERVAL_MS);

// Condorcet appelle cette route après un dépôt dans `incoming/`. Le corps est
// ignoré. La réponse part tout de suite, le job tourne ensuite dans ce
// processus. Elle ne dit pas si un passage a été lancé : appel trop proche ou
// verrou tenu par le cron, le passage en cours ou le suivant traitera le dépôt.
export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!hasBearerToken(authorization, process.env.DELIVERY_NOTIFY_TOKEN)) {
    return new Response(null, { status: 401 });
  }
  if (throttle.tryStart(Date.now())) {
    after(async () => {
      await runIngestJob(["run"], process.env);
    });
  }
  return Response.json(
    { status: "accepted" },
    { status: 202, headers: { "cache-control": "no-store" } },
  );
}
