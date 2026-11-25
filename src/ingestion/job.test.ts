import { afterEach, describe, expect, it, vi } from "vitest";

describe("job ingest", () => {
  afterEach(() => {
    process.exitCode = 0;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("journalise le rapport en une ligne JSON et sort en erreur s'il échoue", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    await import("./job");

    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      event: "ingest.run",
      ok: false,
      error: "DATABASE_URL est obligatoire",
    });
    expect(process.exitCode).toBe(1);
  });
});
