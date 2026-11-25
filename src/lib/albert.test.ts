import { describe, expect, it } from "vitest";
import {
  EMBEDDING_DIMENSIONS,
  createAlbertClient,
  parseChatResponse,
  parseRerankResponse,
} from "./albert";
import { AlbertError } from "./albert-http";

function vector(fill: number, dimensions = EMBEDDING_DIMENSIONS): number[] {
  return Array.from({ length: dimensions }, () => fill);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clientReplying(...responses: Response[]) {
  const requests: { url: string; body: unknown }[] = [];
  async function fakeFetch(
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> {
    const body: unknown =
      typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    requests.push({ url: String(input), body });
    const next = responses.shift();
    if (next === undefined) throw new Error("appel fetch inattendu");
    return next;
  }
  const client = createAlbertClient({
    apiKey: "test-key",
    baseUrl: "https://albert.example/v1/",
    fetch: fakeFetch,
  });
  return { client, requests };
}

describe("createAlbertClient().embed", () => {
  it("renvoie un vecteur par texte, dans l'ordre des textes", async () => {
    const { client, requests } = clientReplying(
      jsonResponse({
        data: [
          { index: 0, embedding: vector(0.1) },
          { index: 1, embedding: vector(0.2) },
        ],
        usage: { prompt_tokens: 4, total_tokens: 4 },
      }),
    );

    const vectors = await client.embed(["un", "deux"]);

    expect(vectors).toEqual([vector(0.1), vector(0.2)]);
    expect(requests).toEqual([
      {
        url: "https://albert.example/v1/embeddings",
        body: { model: "bge-m3", input: ["un", "deux"] },
      },
    ]);
  });

  it("remet dans l'ordre des index une réponse désordonnée", async () => {
    const { client } = clientReplying(
      jsonResponse({
        data: [
          { index: 2, embedding: vector(0.3) },
          { index: 0, embedding: vector(0.1) },
          { index: 1, embedding: vector(0.2) },
        ],
      }),
    );

    await expect(client.embed(["a", "b", "c"])).resolves.toEqual([
      vector(0.1),
      vector(0.2),
      vector(0.3),
    ]);
  });

  it("refuse un vecteur de mauvaise dimension", async () => {
    const { client } = clientReplying(
      jsonResponse({ data: [{ index: 0, embedding: vector(0.1, 768) }] }),
    );

    await expect(client.embed(["a"])).rejects.toThrow(
      "embedding 0 de dimension 768, 1024 attendue",
    );
  });

  it("refuse un index en double", async () => {
    const { client } = clientReplying(
      jsonResponse({
        data: [
          { index: 0, embedding: vector(0.1) },
          { index: 0, embedding: vector(0.2) },
        ],
      }),
    );

    await expect(client.embed(["a", "b"])).rejects.toThrow("index 0 en double");
  });

  it("refuse une réponse au nombre de vecteurs incorrect", async () => {
    const { client } = clientReplying(
      jsonResponse({ data: [{ index: 0, embedding: vector(0.1) }] }),
    );

    await expect(client.embed(["a", "b"])).rejects.toThrow(
      "1 vecteurs reçus pour 2 textes",
    );
  });

  it.each([
    [null, "champ data absent"],
    [{ data: "x" }, "champ data absent"],
    [{ data: [3] }, "élément de data non objet"],
    [{ data: [{ index: "0", embedding: [] }] }, "index invalide (0)"],
    [{ data: [{ index: 0.5, embedding: [] }] }, "index invalide (0.5)"],
    [{ data: [{ index: -1, embedding: [] }] }, "index invalide (-1)"],
    [{ data: [{ index: 1, embedding: [] }] }, "index invalide (1)"],
    [
      { data: [{ index: 0, embedding: ["0.1"] }] },
      "embedding 0 n'est pas un tableau de nombres",
    ],
  ])("refuse la réponse d'embeddings %j", async (body, reason) => {
    const { client } = clientReplying(jsonResponse(body));

    await expect(client.embed(["a"])).rejects.toThrow(
      new AlbertError(`Réponse d'embeddings Albert invalide : ${reason}`),
    );
  });

  it("découpe en requêtes de 64 textes au plus", async () => {
    function reply(count: number): Response {
      return jsonResponse({
        data: Array.from({ length: count }, (_, index) => ({
          index,
          embedding: vector(count),
        })),
      });
    }
    const { client, requests } = clientReplying(reply(64), reply(6));
    const texts = Array.from({ length: 70 }, (_, i) => `texte ${i}`);

    const vectors = await client.embed(texts);

    expect(vectors).toHaveLength(70);
    expect(vectors[63]).toEqual(vector(64));
    expect(vectors[64]).toEqual(vector(6));
    expect(
      requests.map(({ body }) =>
        isObject(body) && Array.isArray(body.input) ? body.input.length : 0,
      ),
    ).toEqual([64, 6]);
  });

  it("n'appelle pas l'API pour une liste vide", async () => {
    const { client, requests } = clientReplying();

    await expect(client.embed([])).resolves.toEqual([]);
    expect(requests).toHaveLength(0);
  });
});

describe("parseRerankResponse", () => {
  it("lit le format Cohere v2 et trie par pertinence décroissante", () => {
    expect(
      parseRerankResponse(
        {
          object: "list",
          results: [
            { relevance_score: 0.02, index: 0 },
            { relevance_score: 0.9, index: 2 },
          ],
          model: "bge-reranker-v2-m3",
        },
        3,
      ),
    ).toEqual([
      { index: 2, relevanceScore: 0.9 },
      { index: 0, relevanceScore: 0.02 },
    ]);
  });

  it("refuse un index hors des documents envoyés ou en double", () => {
    expect(() =>
      parseRerankResponse({ results: [{ index: 3, relevance_score: 1 }] }, 3),
    ).toThrow("index invalide (3)");
    expect(() =>
      parseRerankResponse(
        {
          results: [
            { index: 1, relevance_score: 1 },
            { index: 1, relevance_score: 0.5 },
          ],
        },
        3,
      ),
    ).toThrow("index 1 en double");
  });

  it("refuse une réponse sans results ou sans score", () => {
    expect(() => parseRerankResponse({ data: [] }, 1)).toThrow(AlbertError);
    expect(() => parseRerankResponse({ results: [{ index: 0 }] }, 1)).toThrow(
      "score de l'index 0 invalide",
    );
    expect(() =>
      parseRerankResponse({ results: [{ index: 0, relevance_score: NaN }] }, 1),
    ).toThrow("score de l'index 0 invalide");
  });

  it("refuse un élément qui n'est pas un objet ou un index non entier", () => {
    expect(() => parseRerankResponse({ results: ["0"] }, 1)).toThrow(
      "élément de results non objet",
    );
    expect(() =>
      parseRerankResponse({ results: [{ index: "0", relevance_score: 1 }] }, 1),
    ).toThrow("index invalide (0)");
    expect(() =>
      parseRerankResponse({ results: [{ index: 0.5, relevance_score: 1 }] }, 1),
    ).toThrow("index invalide (0.5)");
    expect(() =>
      parseRerankResponse({ results: [{ index: -1, relevance_score: 1 }] }, 1),
    ).toThrow("index invalide (-1)");
  });
});

describe("parseChatResponse", () => {
  it("renvoie le contenu du premier choix, sans espaces autour", () => {
    expect(
      parseChatResponse({
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: " Réponse [1]\n" },
          },
        ],
      }),
    ).toBe("Réponse [1]");
  });

  it("refuse une réponse sans choix ou au message vide", () => {
    expect(() => parseChatResponse({ choices: [] })).toThrow(
      "aucun message dans choices",
    );
    expect(() =>
      parseChatResponse({ choices: [{ message: { content: "  " } }] }),
    ).toThrow("message vide");
    expect(() => parseChatResponse("erreur")).toThrow("champ choices absent");
  });
});

describe("createAlbertClient().rerank et .chat", () => {
  it("envoie la requête de reclassement au format Cohere v2", async () => {
    const { client, requests } = clientReplying(
      jsonResponse({
        results: [
          { index: 1, relevance_score: 0.8 },
          { index: 0, relevance_score: 0.1 },
        ],
      }),
    );

    await expect(client.rerank("médecin", ["a", "b"], 5)).resolves.toEqual([
      { index: 1, relevanceScore: 0.8 },
      { index: 0, relevanceScore: 0.1 },
    ]);
    expect(requests).toEqual([
      {
        url: "https://albert.example/v1/rerank",
        body: {
          model: "bge-reranker-v2-m3",
          query: "médecin",
          documents: ["a", "b"],
          top_n: 2,
        },
      },
    ]);
  });

  it("n'appelle pas le reclassement sans document", async () => {
    const { client, requests } = clientReplying();
    await expect(client.rerank("q", [], 5)).resolves.toEqual([]);
    expect(requests).toHaveLength(0);
  });

  it("envoie les messages au modèle de chat et renvoie le texte", async () => {
    const { client, requests } = clientReplying(
      jsonResponse({ choices: [{ message: { content: "Bonjour [1]" } }] }),
    );

    await expect(
      client.chat([{ role: "user", content: "Salut" }]),
    ).resolves.toBe("Bonjour [1]");
    expect(requests).toEqual([
      {
        url: "https://albert.example/v1/chat/completions",
        body: {
          model: "mistral-small-3-2-24b-instruct-2506",
          messages: [{ role: "user", content: "Salut" }],
          temperature: 0.2,
          max_tokens: 700,
        },
      },
    ]);
  });
});
