import { beforeEach, describe, expect, it, vi } from "vitest";
import { findPlace, resolvePlace } from "./find-place";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));
vi.stubEnv("DATABASE_URL", "postgres://test/app");

beforeEach(() => {
  fake.reset();
});

describe("findPlace", () => {
  it("nomme un département et compte ses pages", async () => {
    fake.reply([["25", "Doubs", 700]]);

    await expect(
      findPlace({ kind: "departments", codes: ["25"] }),
    ).resolves.toEqual({
      codes: { kind: "departments", codes: ["25"] },
      label: "Doubs (25)",
      displayName: "Doubs (25)",
      pageCount: 700,
    });
    expect(fake.queries[0].sql).toContain(
      'left join "place_page_counts" on "place_page_counts"."place" = "departments"."code"',
    );
    expect(fake.queries[0].params).toEqual(["25"]);
  });

  it("réunit plusieurs départements dans l'ordre demandé, sans les inconnus", async () => {
    fake.reply([
      ["972", "Martinique", 30],
      ["971", "Guadeloupe", 20],
    ]);

    await expect(
      findPlace({ kind: "departments", codes: ["971", "972", "99"] }),
    ).resolves.toEqual({
      codes: { kind: "departments", codes: ["971", "972"] },
      label: "Guadeloupe, Martinique",
      displayName: "Guadeloupe, Martinique",
      pageCount: 50,
    });
  });

  it("ignore des départements tous inconnus", async () => {
    await expect(
      findPlace({ kind: "departments", codes: ["99"] }),
    ).resolves.toBeUndefined();
  });

  it("nomme une ancienne commune et ne compte que ses pages", async () => {
    fake.reply([["Béon", "01", "Culoz-Béon", 3]]);

    await expect(
      findPlace({ kind: "municipality", code: "01039" }),
    ).resolves.toEqual({
      codes: { kind: "municipality", code: "01039" },
      label: "Béon (01)",
      displayName: "Béon (ancienne commune, aujourd’hui Culoz-Béon)",
      pageCount: 3,
    });
    expect(fake.queries).toHaveLength(1);
    expect(fake.queries[0].sql).toContain(
      'left join "place_page_counts" on "place_page_counts"."place" = "municipality_code_history"."old_code"',
    );
    expect(fake.queries[0].params).toEqual(["01039"]);
  });

  it("cherche une commune actuelle quand le code n'est pas ancien", async () => {
    fake.reply([], [["Culoz-Béon", "01", 20]]);

    await expect(
      findPlace({ kind: "municipality", code: "01138" }),
    ).resolves.toEqual({
      codes: { kind: "municipality", code: "01138" },
      label: "Culoz-Béon (01)",
      displayName: "Culoz-Béon (01)",
      pageCount: 20,
    });
    expect(fake.queries[1].params).toEqual(["01138"]);
  });

  it("ignore une commune inconnue", async () => {
    await expect(
      findPlace({ kind: "municipality", code: "99999" }),
    ).resolves.toBeUndefined();
  });
});

describe("resolvePlace", () => {
  it("ne cherche rien sans lieu", async () => {
    await expect(resolvePlace("  ")).resolves.toEqual({ status: "none" });
    expect(fake.queries).toEqual([]);
  });

  it("lit des codes", async () => {
    fake.reply([], [["Charolles", "71", 286]]);

    await expect(resolvePlace("71106")).resolves.toEqual({
      status: "found",
      place: {
        codes: { kind: "municipality", code: "71106" },
        label: "Charolles (71)",
        displayName: "Charolles (71)",
        pageCount: 286,
      },
    });
  });

  it("signale un code inconnu", async () => {
    await expect(resolvePlace("99999")).resolves.toEqual({
      status: "unknown",
      input: "99999",
    });
  });

  it("prend la première suggestion d'un texte libre", async () => {
    const charolles = {
      kind: "municipality",
      code: "71106",
      name: "Charolles",
      department_code: "71",
      department_name: "Saône-et-Loire",
      page_count: 286,
    };
    fake.reply(
      [charolles],
      [
        {
          ...charolles,
          kind: "department",
          code: "16",
          name: "Charente",
          department_code: "16",
        },
      ],
    );

    await expect(resolvePlace("Charolles (71)")).resolves.toEqual({
      status: "found",
      place: {
        codes: { kind: "municipality", code: "71106" },
        label: "Charolles (71)",
        displayName: "Charolles (71)",
        pageCount: 286,
      },
    });
    await expect(resolvePlace("Charente")).resolves.toEqual({
      status: "found",
      place: {
        codes: { kind: "departments", codes: ["16"] },
        label: "Charente (16)",
        displayName: "Charente (16)",
        pageCount: 286,
      },
    });
  });

  it("reconnaît l'ancien nom d'une commune dans un texte libre", async () => {
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

    await expect(resolvePlace("beon")).resolves.toEqual({
      status: "found",
      place: {
        codes: { kind: "municipality", code: "01039" },
        label: "Béon (01)",
        displayName: "Béon (ancienne commune, aujourd’hui Culoz-Béon)",
        pageCount: 3,
      },
    });
  });

  it("signale un texte sans suggestion", async () => {
    await expect(resolvePlace("zzz")).resolves.toEqual({
      status: "unknown",
      input: "zzz",
    });
  });
});
