import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS, createAlbertClient } from "./albert";

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

  it("explique un refus de clé (401) sans retenter", async () => {
    const { client, requests } = clientReplying(
      jsonResponse({ detail: "Invalid API key" }, 401),
    );

    await expect(client.embed(["a"])).rejects.toThrow(
      "Albert a refusé la clé d'API (401) : vérifier ALBERT_API_KEY",
    );
    expect(requests).toHaveLength(1);
  });

  it("retente après un 503 puis renvoie le vecteur", async () => {
    const { client, requests } = clientReplying(
      jsonResponse({ detail: "indisponible" }, 503),
      jsonResponse({ data: [{ index: 0, embedding: vector(0.5) }] }),
    );

    await expect(client.embed(["a"])).resolves.toEqual([vector(0.5)]);
    expect(requests).toHaveLength(2);
  });

  it("abandonne après trois 429", async () => {
    const { client, requests } = clientReplying(
      jsonResponse({}, 429),
      jsonResponse({}, 429),
      jsonResponse({}, 429),
    );

    await expect(client.embed(["a"])).rejects.toThrow(
      "Albert /embeddings a répondu 429 après 3 essai(s)",
    );
    expect(requests).toHaveLength(3);
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
