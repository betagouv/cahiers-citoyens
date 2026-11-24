import { afterEach, describe, expect, it, vi } from "vitest";
import { AlbertError, createAlbertPost } from "./albert-http";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function postReplying(...outcomes: (Response | Error | string)[]) {
  const requests: { url: string; init: RequestInit | undefined }[] = [];
  async function fakeFetch(
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> {
    requests.push({ url: String(input), init });
    const next = outcomes.shift();
    if (next === undefined) throw new Error("appel fetch inattendu");
    if (next instanceof Response) return next;
    throw next;
  }
  const post = createAlbertPost({
    apiKey: "test-key",
    root: "https://albert.example/v1",
    timeoutMs: 1000,
    fetch: fakeFetch,
  });
  return { post, requests };
}

afterEach(() => {
  vi.useRealTimers();
});

// Fait s'écouler les délais entre deux essais. Le rejet éventuel est
// observé par l'appelant, après coup.
async function settle<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => undefined);
  await vi.runAllTimersAsync();
  return promise;
}

describe("createAlbertPost", () => {
  it("envoie le corps en JSON avec la clé et renvoie la réponse", async () => {
    const { post, requests } = postReplying(jsonResponse({ ok: true }));

    await expect(post("/embeddings", { input: ["a"] })).resolves.toEqual({
      ok: true,
    });
    expect(requests).toHaveLength(1);
    const [{ url, init }] = requests;
    expect(url).toBe("https://albert.example/v1/embeddings");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
    expect(init?.body).toBe('{"input":["a"]}');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("explique un refus de clé (401) sans retenter", async () => {
    const { post, requests } = postReplying(
      jsonResponse({ detail: "Invalid API key" }, 401),
    );

    await expect(post("/embeddings", {})).rejects.toThrow(
      new AlbertError(
        "Albert a refusé la clé d'API (401) : vérifier ALBERT_API_KEY",
      ),
    );
    expect(requests).toHaveLength(1);
  });

  it("ne retente pas une erreur du client autre que 429", async () => {
    const { post, requests } = postReplying(
      new Response("requête invalide", { status: 400 }),
    );

    await expect(post("/rerank", {})).rejects.toThrow(
      "Albert /rerank a répondu 400 après 1 essai(s) : requête invalide",
    );
    expect(requests).toHaveLength(1);
  });

  it("retente après un 503 puis renvoie la réponse", async () => {
    vi.useFakeTimers();
    const { post, requests } = postReplying(
      jsonResponse({ detail: "indisponible" }, 503),
      jsonResponse({ ok: true }),
    );

    await expect(settle(post("/embeddings", {}))).resolves.toEqual({
      ok: true,
    });
    expect(requests).toHaveLength(2);
  });

  it("abandonne après trois 429", async () => {
    vi.useFakeTimers();
    const { post, requests } = postReplying(
      jsonResponse({}, 429),
      jsonResponse({}, 429),
      jsonResponse({}, 429),
    );

    await expect(settle(post("/embeddings", {}))).rejects.toThrow(
      "Albert /embeddings a répondu 429 après 3 essai(s)",
    );
    expect(requests).toHaveLength(3);
  });

  it("transforme une panne réseau persistante en AlbertError", async () => {
    vi.useFakeTimers();
    const { post, requests } = postReplying(
      new TypeError("fetch failed"),
      new TypeError("fetch failed"),
      new TypeError("fetch failed"),
    );

    await expect(settle(post("/chat/completions", {}))).rejects.toThrow(
      new AlbertError(
        "Albert /chat/completions injoignable après 3 essai(s) : fetch failed",
      ),
    );
    expect(requests).toHaveLength(3);
  });

  it("décrit une panne levée sous une autre forme qu'une Error", async () => {
    vi.useFakeTimers();
    const { post } = postReplying("coupure", "coupure", "coupure");

    await expect(settle(post("/rerank", {}))).rejects.toThrow(
      "Albert /rerank injoignable après 3 essai(s) : coupure",
    );
  });

  it("se remet d'une panne réseau passagère", async () => {
    vi.useFakeTimers();
    const { post, requests } = postReplying(
      new TypeError("fetch failed"),
      jsonResponse({ ok: true }),
    );

    await expect(settle(post("/rerank", {}))).resolves.toEqual({ ok: true });
    expect(requests).toHaveLength(2);
  });
});
