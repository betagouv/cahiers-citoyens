import { describe, expect, it, vi } from "vitest";
import { fetchJson, fetchText } from "./fetch-source";

describe("fetchJson", () => {
  it("renvoie le corps JSON de la réponse", async () => {
    const fetchImpl = vi.fn(async () => Response.json([{ code: "01" }]));

    expect(await fetchJson(fetchImpl, "https://exemple.test/a")).toEqual([
      { code: "01" },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith("https://exemple.test/a");
  });

  it("échoue sur un statut d'erreur", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 503 }));

    await expect(
      fetchJson(fetchImpl, "https://exemple.test/a"),
    ).rejects.toThrow("https://exemple.test/a a répondu 503");
  });
});

describe("fetchText", () => {
  it("renvoie le texte de la réponse", async () => {
    const fetchImpl = vi.fn(async () => new Response('"MOD"\n'));

    expect(await fetchText(fetchImpl, "https://exemple.test/b")).toBe(
      '"MOD"\n',
    );
  });
});
