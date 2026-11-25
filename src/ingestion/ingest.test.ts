import { describe, expect, it } from "vitest";
import { ingest } from "./ingest";
import type { PingableDatabase } from "./ping-database";

function fakeConnect(execute: () => Promise<unknown>): {
  connect: (url: string) => PingableDatabase;
  urls: string[];
} {
  const urls: string[] = [];
  return {
    urls,
    connect(url) {
      urls.push(url);
      return { execute, $client: { end: async () => {} } };
    },
  };
}

describe("ingest", () => {
  it("se connecte à l'URL donnée et rapporte un succès", async () => {
    const { connect, urls } = fakeConnect(async () => []);
    const report = await ingest("postgres://localhost/cahiers", connect);
    expect(urls).toEqual(["postgres://localhost/cahiers"]);
    expect(report).toMatchObject({ event: "ingest.run", ok: true });
  });

  it("rapporte l'échec de la requête", async () => {
    const { connect } = fakeConnect(() =>
      Promise.reject(new Error("connect ECONNREFUSED")),
    );
    const report = await ingest("postgres://localhost/cahiers", connect);
    expect(report).toMatchObject({
      ok: false,
      error: "connect ECONNREFUSED",
    });
  });

  it("refuse une URL invalide sans se connecter", async () => {
    const { connect, urls } = fakeConnect(async () => []);
    const report = await ingest(undefined, connect);
    expect(urls).toEqual([]);
    expect(report).toMatchObject({
      ok: false,
      error: "DATABASE_URL est obligatoire",
    });
  });
});
