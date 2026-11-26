import { beforeEach, describe, expect, it, vi } from "vitest";
import { INGEST_LOCK_KEY, createAdvisoryLock } from "./run-lock";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
const connect = vi.hoisted(() => vi.fn());
vi.mock("postgres", () => ({ default: connect }));

beforeEach(() => {
  fake.reset();
  connect.mockReset().mockImplementation((url: string) => fake.connect(url));
});

describe("createAdvisoryLock", () => {
  it("tente le verrou sur une connexion unique, sans attendre", async () => {
    fake.reply([{ locked: true }], [{ locked: false }]);
    const lock = createAdvisoryLock("postgres://test/app");

    await expect(lock.tryAcquire()).resolves.toBe(true);
    await expect(lock.tryAcquire()).resolves.toBe(false);
    await expect(lock.tryAcquire()).resolves.toBe(false);
    expect(connect).toHaveBeenCalledWith("postgres://test/app", { max: 1 });
    expect(fake.queries[0]).toEqual({
      sql: "select pg_try_advisory_lock($1) as locked",
      params: [INGEST_LOCK_KEY],
    });
  });

  it("libère le verrou en fermant sa connexion", async () => {
    await createAdvisoryLock("postgres://test/app").release();
    expect(fake.ended).toBe(true);
  });
});
