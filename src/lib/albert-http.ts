const MAX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 500;

// Toute défaillance d'Albert (réseau, HTTP, réponse illisible) : l'appelant
// peut la distinguer d'une erreur de base de données et se replier.
export class AlbertError extends Error {}

export interface AlbertHttpOptions {
  apiKey: string;
  root: string;
  timeoutMs: number;
  fetch: typeof fetch;
}

export type AlbertPost = (path: string, body: unknown) => Promise<unknown>;

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POST JSON vers `root + path`, retenté avec un délai doublé à chaque essai
// sur panne réseau, 429 ou 5xx. Renvoie le corps JSON, non validé.
export function createAlbertPost({
  apiKey,
  root,
  timeoutMs,
  fetch: fetchImpl,
}: AlbertHttpOptions): AlbertPost {
  return async function post(path, body) {
    for (let attempt = 1; ; attempt++) {
      let response: Response;
      try {
        response = await fetchImpl(`${root}${path}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        if (attempt >= MAX_ATTEMPTS) {
          const reason = error instanceof Error ? error.message : String(error);
          throw new AlbertError(
            `Albert ${path} injoignable après ${attempt} essai(s) : ${reason}`,
          );
        }
        await wait(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
        continue;
      }
      if (response.ok) {
        const raw: unknown = await response.json();
        return raw;
      }
      if (response.status === 401) {
        throw new AlbertError(
          "Albert a refusé la clé d'API (401) : vérifier ALBERT_API_KEY",
        );
      }
      if (!isRetryable(response.status) || attempt >= MAX_ATTEMPTS) {
        const detail = (await response.text()).slice(0, 200);
        throw new AlbertError(
          `Albert ${path} a répondu ${response.status} après ${attempt} essai(s) : ${detail}`,
        );
      }
      await wait(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
    }
  };
}
