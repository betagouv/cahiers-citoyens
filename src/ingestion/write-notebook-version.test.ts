import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import { type WriteChange, planChanges } from "./plan";
import { EXAMPLE_ID } from "./test-notebook";
import { verifiedExample } from "./test-plan";
import { writeNotebookVersion } from "./write-notebook-version";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));

const db = createDatabase("postgres://test/app");

function publish(): WriteChange {
  const [change] = planChanges(
    { name: "d.zip", notebooks: [verifiedExample()] },
    new Map(),
  ).changes;
  if (change.kind !== "publish") throw new Error("publication attendue");
  return change;
}

beforeEach(() => {
  fake.reset();
});

describe("writeNotebookVersion", () => {
  it("crée le cahier, ajoute la version, le met en ligne puis remplace pages, lignes et chunks", async () => {
    await db.transaction((tx) => writeNotebookVersion(tx, publish(), 7));

    expect(fake.queries.map(({ sql }) => sql.split(" (")[0])).toEqual([
      "begin",
      'insert into "notebooks"',
      'insert into "notebook_versions"',
      expect.stringMatching(/^update "notebooks" set /),
      'delete from "chunks" where "chunks"."notebook_id" = $1',
      'delete from "pages" where "pages"."notebook_id" = $1',
      'insert into "pages"',
      'insert into "lines"',
      'insert into "chunks"',
      "commit",
    ]);
    expect(fake.queries[1].sql).toMatch(/on conflict do nothing$/);
    const change = publish();
    expect(fake.queries[2].params).toEqual([
      EXAMPLE_ID,
      1,
      7,
      change.verified.fingerprint,
      "Campus Condorcet",
      2,
    ]);
    expect(fake.queries[3].sql).toContain('"imported_at" = now()');
    expect(fake.queries[3].params).toEqual([
      "published",
      1,
      null,
      null,
      "Ain",
      "01",
      "Exempleville",
      "01004",
      "01500",
      "automatic",
      "manual",
      EXAMPLE_ID,
    ]);
    expect(fake.queries[6].params).toHaveLength(14);
  });
});
