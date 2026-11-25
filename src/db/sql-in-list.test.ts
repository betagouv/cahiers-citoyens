import { PgDialect } from "drizzle-orm/pg-core";
import { expect, it } from "vitest";
import { sqlInList } from "./sql-in-list";

it("écrit les valeurs entre apostrophes, en doublant celles qu'elles contiennent", () => {
  const query = new PgDialect().sqlToQuery(sqlInList(["published", "l'autre"]));

  expect(query).toEqual({ sql: "('published', 'l''autre')", params: [] });
});
