import { describe, expect, it } from "vitest";
import { exitCode, runJob } from "./run-job";

function clock(...times: number[]): () => number {
  let index = 0;
  return () => times[index++] ?? Number.NaN;
}

describe("exitCode", () => {
  it("vaut 0 pour un succès et 1 pour un échec", () => {
    expect(exitCode({ event: "ingest.run", ok: true, durationMs: 1 })).toBe(0);
    expect(
      exitCode({ event: "ingest.run", ok: false, durationMs: 1, error: "x" }),
    ).toBe(1);
  });
});

describe("runJob", () => {
  it("rapporte un succès avec sa durée arrondie", async () => {
    const report = await runJob("ingest.run", async () => {}, clock(10, 52.6));
    expect(report).toEqual({ event: "ingest.run", ok: true, durationMs: 43 });
  });

  it("rapporte un échec avec le message, sans lever", async () => {
    const report = await runJob(
      "ingest.run",
      () => Promise.reject(new Error("base injoignable")),
      clock(0, 5),
    );
    expect(report).toEqual({
      event: "ingest.run",
      ok: false,
      durationMs: 5,
      error: "base injoignable",
    });
  });

  it("capture aussi une erreur levée avant la première attente", async () => {
    const report = await runJob(
      "ingest.run",
      () => {
        throw new Error("DATABASE_URL est obligatoire");
      },
      clock(0, 0),
    );
    expect(report).toMatchObject({
      ok: false,
      error: "DATABASE_URL est obligatoire",
    });
  });
});
