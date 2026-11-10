export const ALBERT_BASE_URL = "https://albert.api.etalab.gouv.fr/v1";
export const EMBEDDING_MODEL = "bge-m3";
export const EMBEDDING_DIMENSIONS = 1024;
// Au-delà, Albert répond 413 (« maximum allowed batch size 64 »).
export const MAX_EMBEDDING_BATCH = 64;

const MAX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 500;

export interface AlbertClientOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  fetch?: typeof fetch;
}

export interface AlbertClient {
  embed(texts: string[]): Promise<number[][]>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((x) => typeof x === "number");
}

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseEmbeddingResponse(
  raw: unknown,
  expectedCount: number,
): number[][] {
  function failure(reason: string): Error {
    return new Error(`Réponse d'embeddings Albert invalide : ${reason}`);
  }
  if (!isObject(raw) || !Array.isArray(raw.data))
    throw failure("champ data absent");
  if (raw.data.length !== expectedCount) {
    throw failure(
      `${raw.data.length} vecteurs reçus pour ${expectedCount} textes`,
    );
  }
  const vectors: (number[] | undefined)[] = Array.from({
    length: expectedCount,
  });
  for (const item of raw.data) {
    if (!isObject(item)) throw failure("élément de data non objet");
    const { index, embedding } = item;
    if (
      typeof index !== "number" ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= expectedCount
    ) {
      throw failure(`index invalide (${String(index)})`);
    }
    if (vectors[index] !== undefined) throw failure(`index ${index} en double`);
    if (!isNumberArray(embedding)) {
      throw failure(`embedding ${index} n'est pas un tableau de nombres`);
    }
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw failure(
        `embedding ${index} de dimension ${embedding.length}, ${EMBEDDING_DIMENSIONS} attendue`,
      );
    }
    vectors[index] = embedding;
  }
  return vectors.filter((vector) => vector !== undefined);
}

export function createAlbertClient({
  apiKey,
  baseUrl = ALBERT_BASE_URL,
  model = EMBEDDING_MODEL,
  fetch: fetchImpl = fetch,
}: AlbertClientOptions): AlbertClient {
  const url = `${baseUrl.replace(/\/+$/, "")}/embeddings`;

  async function embedBatch(texts: string[]): Promise<number[][]> {
    for (let attempt = 1; ; attempt++) {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, input: texts }),
      });
      if (response.ok) {
        const raw: unknown = await response.json();
        return parseEmbeddingResponse(raw, texts.length);
      }
      if (response.status === 401) {
        throw new Error(
          "Albert a refusé la clé d'API (401) : vérifier ALBERT_API_KEY",
        );
      }
      if (!isRetryable(response.status) || attempt >= MAX_ATTEMPTS) {
        const detail = (await response.text()).slice(0, 200);
        throw new Error(
          `Albert /embeddings a répondu ${response.status} après ${attempt} essai(s) : ${detail}`,
        );
      }
      await wait(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
    }
  }

  async function embed(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let start = 0; start < texts.length; start += MAX_EMBEDDING_BATCH) {
      const batch = texts.slice(start, start + MAX_EMBEDDING_BATCH);
      vectors.push(...(await embedBatch(batch)));
    }
    return vectors;
  }

  return { embed };
}
