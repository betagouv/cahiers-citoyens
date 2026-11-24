import { AlbertError, createAlbertPost } from "./albert-http";

export const ALBERT_BASE_URL = "https://albert.api.etalab.gouv.fr/v1";
export const EMBEDDING_MODEL = "bge-m3";
export const EMBEDDING_DIMENSIONS = 1024;
// Au-delà, Albert répond 413 (« maximum allowed batch size 64 »).
export const MAX_EMBEDDING_BATCH = 64;
export const RERANK_MODEL = "bge-reranker-v2-m3";
export const DEFAULT_CHAT_MODEL = "mistral-small-3-2-24b-instruct-2506";

const DEFAULT_TIMEOUT_MS = 30_000;

export interface AlbertClientOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  rerankModel?: string;
  chatModel?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface RerankResult {
  index: number;
  relevanceScore: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface AlbertClient {
  embed(texts: string[]): Promise<number[][]>;
  rerank(
    query: string,
    documents: string[],
    topN: number,
  ): Promise<RerankResult[]>;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((x) => typeof x === "number");
}

function parseEmbeddingResponse(
  raw: unknown,
  expectedCount: number,
): number[][] {
  function failure(reason: string): Error {
    return new AlbertError(`Réponse d'embeddings Albert invalide : ${reason}`);
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

export function parseRerankResponse(
  raw: unknown,
  documentCount: number,
): RerankResult[] {
  function failure(reason: string): Error {
    return new AlbertError(
      `Réponse de reclassement Albert invalide : ${reason}`,
    );
  }
  if (!isObject(raw) || !Array.isArray(raw.results)) {
    throw failure("champ results absent");
  }
  const seen = new Set<number>();
  const results = raw.results.map((item: unknown) => {
    if (!isObject(item)) throw failure("élément de results non objet");
    const { index, relevance_score: relevanceScore } = item;
    if (
      typeof index !== "number" ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= documentCount
    ) {
      throw failure(`index invalide (${String(index)})`);
    }
    if (seen.has(index)) throw failure(`index ${index} en double`);
    seen.add(index);
    if (typeof relevanceScore !== "number" || Number.isNaN(relevanceScore)) {
      throw failure(`score de l'index ${index} invalide`);
    }
    return { index, relevanceScore };
  });
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export function parseChatResponse(raw: unknown): string {
  function failure(reason: string): Error {
    return new AlbertError(`Réponse de chat Albert invalide : ${reason}`);
  }
  if (!isObject(raw) || !Array.isArray(raw.choices)) {
    throw failure("champ choices absent");
  }
  const choice: unknown = raw.choices.at(0);
  if (!isObject(choice) || !isObject(choice.message)) {
    throw failure("aucun message dans choices");
  }
  const { content } = choice.message;
  if (typeof content !== "string" || content.trim() === "") {
    throw failure("message vide");
  }
  return content.trim();
}

export function createAlbertClient({
  apiKey,
  baseUrl = ALBERT_BASE_URL,
  model = EMBEDDING_MODEL,
  rerankModel = RERANK_MODEL,
  chatModel = DEFAULT_CHAT_MODEL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetch: fetchImpl = fetch,
}: AlbertClientOptions): AlbertClient {
  const post = createAlbertPost({
    apiKey,
    root: baseUrl.replace(/\/+$/, ""),
    timeoutMs,
    fetch: fetchImpl,
  });

  async function embed(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let start = 0; start < texts.length; start += MAX_EMBEDDING_BATCH) {
      const batch = texts.slice(start, start + MAX_EMBEDDING_BATCH);
      const raw = await post("/embeddings", { model, input: batch });
      vectors.push(...parseEmbeddingResponse(raw, batch.length));
    }
    return vectors;
  }

  async function rerank(
    query: string,
    documents: string[],
    topN: number,
  ): Promise<RerankResult[]> {
    if (documents.length === 0) return [];
    const raw = await post("/rerank", {
      model: rerankModel,
      query,
      documents,
      top_n: Math.min(topN, documents.length),
    });
    return parseRerankResponse(raw, documents.length).slice(0, topN);
  }

  async function chat(
    messages: ChatMessage[],
    { temperature = 0.2, maxTokens = 700 }: ChatOptions = {},
  ): Promise<string> {
    const raw = await post("/chat/completions", {
      model: chatModel,
      messages,
      temperature,
      max_tokens: maxTokens,
    });
    return parseChatResponse(raw);
  }

  return { embed, rerank, chat };
}
