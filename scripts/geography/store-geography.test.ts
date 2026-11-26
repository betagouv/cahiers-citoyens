import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase } from "../../src/db/client";
import { batches, replaceGeography } from "./store-geography";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../../src/test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));

beforeEach(() => {
  fake.reset();
});

describe("batches", () => {
  it("découpe en lots de la taille demandée, le dernier plus court", () => {
    expect(batches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(batches([], 2)).toEqual([]);
  });
});

describe("replaceGeography", () => {
  it("vide puis recharge les trois tables dans une transaction", async () => {
    await replaceGeography(createDatabase("postgres://test/app"), {
      departments: [
        { code: "01", name: "Département fictif", regionCode: "84" },
      ],
      municipalities: [
        {
          inseeCode: "01001",
          name: "Commune-Fictive",
          departmentCode: "01",
          population: 12,
          postalCodes: ["01400"],
          searchName: "commune fictive",
        },
      ],
      codeChanges: [
        {
          oldCode: "01002",
          currentCode: "01001",
          name: "Ancienne-Fictive",
          departmentCode: "01",
          searchName: "ancienne fictive",
        },
      ],
    });

    expect(
      fake.queries.map(({ sql }) => sql.split(" ").slice(0, 3).join(" ")),
    ).toEqual([
      "begin",
      'delete from "municipality_code_history"',
      'delete from "municipalities"',
      'delete from "departments"',
      'insert into "departments"',
      'insert into "municipalities"',
      'insert into "municipality_code_history"',
      "commit",
      "select refresh_search_counts()",
    ]);
    expect(fake.queries.slice(4, 7).map(({ params }) => params)).toEqual([
      ["01", "Département fictif", "84"],
      ["01001", "Commune-Fictive", "01", 12, '{"01400"}', "commune fictive"],
      ["01002", "01001", "Ancienne-Fictive", "01", "ancienne fictive"],
    ]);
  });
});
