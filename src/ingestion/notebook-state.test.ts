import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../db/client";
import { readNotebookStates } from "./notebook-state";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));

const db = createDatabase("postgres://test/app");

beforeEach(() => {
  fake.reset();
});

describe("readNotebookStates", () => {
  it("lit la version en ligne, la dernière attribuée et les images des pages", async () => {
    fake.reply(
      [
        ["a", "published", 2, "f".repeat(64), "3"],
        ["b", "withdrawn", null, null, "0"],
      ],
      [
        ["a", "notebooks/a/v2/1.jpg"],
        ["a", "notebooks/a/v2/2.png"],
      ],
    );

    const states = await readNotebookStates(db, ["a", "b", "c"], false);

    expect([...states]).toEqual([
      [
        "a",
        {
          status: "published",
          onlineVersion: 2,
          fingerprint: "f".repeat(64),
          latestVersion: 3,
          imageKeys: ["notebooks/a/v2/1.jpg", "notebooks/a/v2/2.png"],
        },
      ],
      [
        "b",
        {
          status: "withdrawn",
          onlineVersion: null,
          fingerprint: null,
          latestVersion: 0,
          imageKeys: [],
        },
      ],
    ]);
    const [notebooksQuery, pagesQuery] = fake.queries;
    expect(notebooksQuery.sql).toContain(
      'left join "notebook_versions" "online" on ("online"."notebook_id" = "notebooks"."id" and "online"."version" = "notebooks"."online_version")',
    );
    expect(notebooksQuery.sql).not.toContain("for update");
    expect(notebooksQuery.params).toEqual(["a", "b", "c"]);
    expect(pagesQuery.sql).toContain(
      'order by "pages"."notebook_id" asc, "pages"."number" asc',
    );
  });

  it("verrouille les lignes des cahiers dans une transaction", async () => {
    await readNotebookStates(db, ["a"], true);

    expect(fake.queries[0].sql).toMatch(
      /order by "notebooks"."id" asc for update of "notebooks"$/,
    );
  });
});
