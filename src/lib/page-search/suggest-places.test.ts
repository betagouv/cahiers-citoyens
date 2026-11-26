import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_PLACE_SUGGESTIONS, suggestPlaces } from "./suggest-places";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));
vi.stubEnv("DATABASE_URL", "postgres://test/app");

beforeEach(() => {
  fake.reset();
});

function query() {
  const [recorded] = fake.queries;
  return { sql: recorded.sql.replace(/\s+/g, " "), params: recorded.params };
}

describe("suggestPlaces", () => {
  it("ne cherche rien avant deux caractères", async () => {
    await expect(suggestPlaces(" c")).resolves.toEqual([]);
    expect(fake.queries).toEqual([]);
  });

  it("renvoie départements et communes avec leur nombre de pages", async () => {
    fake.reply([
      {
        kind: "department",
        code: "16",
        name: "Charente",
        department_code: "16",
        department_name: "Charente",
        page_count: 1312,
      },
      {
        kind: "municipality",
        code: "71106",
        name: "Charolles",
        department_code: "71",
        department_name: "Saône-et-Loire",
        page_count: 286,
      },
    ]);

    await expect(suggestPlaces("Char")).resolves.toEqual([
      {
        kind: "department",
        code: "16",
        name: "Charente",
        departmentCode: "16",
        departmentName: "Charente",
        pageCount: 1312,
      },
      {
        kind: "municipality",
        code: "71106",
        name: "Charolles",
        departmentCode: "71",
        departmentName: "Saône-et-Loire",
        pageCount: 286,
      },
    ]);
    const { sql, params } = query();
    expect(sql).toContain("where (m.search_name like $");
    expect(sql).not.toContain("postal_codes");
    expect(sql).toContain("left join place_page_counts c on c.place = f.code");
    expect(sql).toContain(
      "order by f.exact desc, page_count desc, f.population desc nulls last, f.name",
    );
    expect(params).toContain("char%");
    expect(params).toContain(true);
    expect(params.at(-1)).toBe(MAX_PLACE_SUGGESTIONS);
  });

  it("cherche les communes d'un code de département", async () => {
    await suggestPlaces("71");

    expect(query().sql).toContain(
      "(m.search_name like $6 or m.department_code = $7)",
    );
    expect(query().params[6]).toBe("71");
  });

  it("cherche par code postal ou code INSEE à partir de 4 chiffres", async () => {
    await suggestPlaces("71120");

    const { sql, params } = query();
    expect(sql).toContain(
      "(m.search_name like $6 or m.insee_code = $7 or m.postal_codes && $8::text[])",
    );
    expect(params.slice(5, 8)).toEqual(["71120%", "71120", "{71120}"]);
  });

  it("restreint une étiquette « Nom (code) » aux communes du département", async () => {
    await suggestPlaces("Charolles (71)");

    const { sql, params } = query();
    expect(sql).toContain("(m.search_name like $6) and m.department_code = $7");
    expect(params[2]).toBe(false);
    expect(params[6]).toBe("71");
  });

  it("propose une ancienne commune sous son nom de 2019", async () => {
    fake.reply([
      {
        kind: "formerMunicipality",
        code: "01039",
        name: "Béon",
        department_code: "01",
        department_name: "Ain",
        page_count: 3,
        current_name: "Culoz-Béon",
      },
    ]);

    await expect(suggestPlaces("béon")).resolves.toEqual([
      {
        kind: "formerMunicipality",
        code: "01039",
        name: "Béon",
        departmentCode: "01",
        departmentName: "Ain",
        pageCount: 3,
        currentName: "Culoz-Béon",
      },
    ]);
    const { sql, params } = query();
    expect(sql).toContain(
      "from municipality_code_history h join municipalities cur on cur.insee_code = h.current_code",
    );
    expect(sql).toContain(
      "where (h.search_name like $7) and true and h.name <> '' and h.search_name <> cur.search_name",
    );
    expect(params[6]).toBe("beon%");
  });

  it("cherche une ancienne commune par son code de 2019, sans code postal", async () => {
    await suggestPlaces("01039");

    expect(query().sql).toContain(
      "where (h.search_name like $9 or h.old_code = $10) and true",
    );
  });

  it("restreint aussi les anciennes communes au département d'une étiquette", async () => {
    await suggestPlaces("Béon (01)");

    const { sql, params } = query();
    expect(sql).toContain("(h.search_name like $8) and h.department_code = $9");
    expect(params.slice(7, 9)).toEqual(["beon%", "01"]);
  });
});
