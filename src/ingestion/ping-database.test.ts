import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { type PingableDatabase, pingDatabase } from "./ping-database";

const dialect = new PgDialect();

function fakeDatabase(execute: () => Promise<unknown>): {
  database: PingableDatabase;
  calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    database: {
      async execute(query) {
        calls.push(dialect.sqlToQuery(query).sql);
        return execute();
      },
      $client: {
        async end() {
          calls.push("end");
        },
      },
    },
  };
}

describe("pingDatabase", () => {
  it("lance select 1 puis ferme la connexion", async () => {
    const { database, calls } = fakeDatabase(async () => [{ "?column?": 1 }]);
    await pingDatabase(database);
    expect(calls).toEqual(["select 1", "end"]);
  });

  it("ferme la connexion même si la requête échoue", async () => {
    const { database, calls } = fakeDatabase(() =>
      Promise.reject(new Error("connect ECONNREFUSED")),
    );
    await expect(pingDatabase(database)).rejects.toThrow(
      "connect ECONNREFUSED",
    );
    expect(calls).toEqual(["select 1", "end"]);
  });
});
