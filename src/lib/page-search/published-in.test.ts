import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { publishedIn } from "./published-in";

const dialect = new PgDialect();

function render(place: Parameters<typeof publishedIn>[0]) {
  const condition = publishedIn(place);
  return condition === undefined ? undefined : dialect.sqlToQuery(condition);
}

describe("publishedIn", () => {
  it("garde les cahiers publiés, partout en France", () => {
    expect(render(undefined)).toMatchObject({
      sql: '"notebooks"."status" = $1',
      params: ["published"],
    });
  });

  it("filtre sur les départements", () => {
    expect(
      render({ kind: "departments", codes: ["971", "972"] }),
    ).toMatchObject({
      sql: '("notebooks"."status" = $1 and "notebooks"."department_code" in ($2, $3))',
      params: ["published", "971", "972"],
    });
  });

  it("filtre sur la commune et ses anciens codes INSEE", () => {
    const query = render({ kind: "municipality", code: "71106" });

    expect(query?.sql).toBe(
      '("notebooks"."status" = $1 and "notebooks"."insee_code" = any(array(select $2::text union all select old_code from municipality_code_history where current_code = $3)))',
    );
    expect(query?.params).toEqual(["published", "71106", "71106"]);
  });
});
