import { errorMessage } from "./error-message";

export const ALERT_EVENTS = [
  "delivery.rejected",
  "delivery.failed",
  "incoming.stale",
  "chunks.unembedded",
] as const;

export type AlertEvent = (typeof ALERT_EVENTS)[number];

// Corps du POST : `text` suffit à Mattermost, Slack ou un bot Tchap ; `event`
// et `details` servent à un outil qui trie les alertes.
export interface Alert {
  event: AlertEvent;
  text: string;
  details: Record<string, string | number>;
}

// Ne lève jamais : une alerte perdue ne doit pas faire échouer le job.
export type SendAlert = (alert: Alert) => Promise<void>;

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export interface AlerterOptions {
  // `ALERT_WEBHOOK_URL`. Absente : l'alerte n'est que journalisée.
  webhookUrl: string | undefined;
  fetch: Fetch;
  log: (message: string) => void;
  timeoutMs?: number;
}

async function post(
  url: string,
  alert: Alert,
  fetch: Fetch,
  timeoutMs: number,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(alert),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`webhook en ${response.status}`);
}

// Chaque alerte part en une ligne JSON sur la sortie d'erreur, puis au
// webhook s'il est configuré. Un webhook en panne ne laisse qu'une ligne de log.
export function createAlerter({
  webhookUrl,
  fetch,
  log,
  timeoutMs = 10_000,
}: AlerterOptions): SendAlert {
  return async (alert) => {
    log(JSON.stringify({ event: "ingest.alert", alert }));
    if (!webhookUrl) return;
    try {
      await post(webhookUrl, alert, fetch, timeoutMs);
    } catch (error) {
      log(
        JSON.stringify({
          event: "ingest.alert-failed",
          alert: alert.event,
          error: errorMessage(error),
        }),
      );
    }
  };
}
