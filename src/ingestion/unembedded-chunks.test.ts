import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import type { SendAlert } from "./alert";
import { claimNotice, clearNotice } from "./alert-notices";
import { alertUnembeddedChunks, countStaleChunks } from "./unembedded-chunks";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));
vi.mock("./alert-notices", () => ({
  claimNotice: vi.fn(),
  clearNotice: vi.fn(),
}));

const db = createDatabase("postgres://test/app");
const NOW = new Date("2026-11-26T10:00:00Z");
const alert = vi.fn<SendAlert>(() => Promise.resolve());

beforeEach(() => {
  fake.reset();
  alert.mockClear();
  vi.mocked(claimNotice).mockReset();
  vi.mocked(clearNotice).mockReset();
});

describe("countStaleChunks", () => {
  it("compte les chunks sans embedding créés avant la date", async () => {
    fake.reply([[4]]);

    await expect(countStaleChunks(db, NOW)).resolves.toBe(4);
    expect(fake.queries[0]).toEqual({
      sql: 'select count(*) from "chunks" where ("chunks"."embedding" is null and "chunks"."created_at" < $1)',
      params: [NOW.toISOString()],
    });
  });

  it("vaut 0 sans ligne", async () => {
    fake.reply([]);

    await expect(countStaleChunks(db, NOW)).resolves.toBe(0);
  });
});

describe("alertUnembeddedChunks", () => {
  const deps = { db, alert, now: () => NOW };

  it("alerte sur les chunks en attente depuis plus de 24 h", async () => {
    fake.reply([[4]]);
    vi.mocked(claimNotice).mockResolvedValue(true);

    await alertUnembeddedChunks(deps);

    expect(fake.queries[0].params).toEqual(["2026-11-25T10:00:00.000Z"]);
    expect(claimNotice).toHaveBeenCalledWith(db, "chunks.unembedded", NOW);
    expect(alert).toHaveBeenCalledWith({
      event: "chunks.unembedded",
      text: "4 chunk(s) attendent leur embedding depuis plus de 24 h : la recherche sémantique ne les trouve pas.",
      details: { chunks: 4 },
    });
  });

  it("n'alerte pas deux fois dans la journée", async () => {
    fake.reply([[4]]);
    vi.mocked(claimNotice).mockResolvedValue(false);

    await alertUnembeddedChunks(deps);

    expect(alert).not.toHaveBeenCalled();
  });

  it("réarme l'alerte quand tout est vectorisé", async () => {
    fake.reply([[0]]);

    await alertUnembeddedChunks(deps);

    expect(clearNotice).toHaveBeenCalledWith(db, "chunks.unembedded");
    expect(alert).not.toHaveBeenCalled();
  });
});
