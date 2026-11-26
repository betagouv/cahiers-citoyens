import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import { refreshSearchCounts } from "./search-counts";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));

beforeEach(() => {
  fake.reset();
});

describe("refreshSearchCounts", () => {
  it("appelle refresh_search_counts()", async () => {
    await refreshSearchCounts(createDatabase("postgres://test/app"));

    expect(fake.queries).toEqual([
      { sql: "select refresh_search_counts()", params: [] },
    ]);
  });
});
