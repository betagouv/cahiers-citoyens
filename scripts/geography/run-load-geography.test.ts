import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEPARTMENTS_URL,
  MOVEMENTS_URL,
  MUNICIPALITIES_URL,
  parseLoadGeographyOptions,
  runLoadGeography,
} from "./run-load-geography";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../../src/test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));

const ENV = { DATABASE_URL: "postgres://test/app" };
const MOVEMENTS_HEADER =
  '"MOD","DATE_EFF","TYPECOM_AV","COM_AV","TYPECOM_AP","COM_AP"';

function fakeFetch(movements: string, departments: unknown = []) {
  const bodies = new Map<string, Response>([
    [DEPARTMENTS_URL, Response.json(departments)],
    [
      MUNICIPALITIES_URL,
      Response.json([
        {
          nom: "Commune Fictive",
          code: "01001",
          codesPostaux: ["01400"],
          codeDepartement: "01",
          population: 5,
        },
      ]),
    ],
    [MOVEMENTS_URL, new Response(movements)],
  ]);
  return vi.fn(async (url: string | URL | Request) => {
    const response = bodies.get(String(url));
    return response ?? new Response("", { status: 404 });
  });
}

beforeEach(() => {
  fake.reset();
});

describe("parseLoadGeographyOptions", () => {
  it("prend le fichier des mouvements du COG 2026 par défaut", () => {
    expect(parseLoadGeographyOptions([], ENV)).toEqual({
      databaseUrl: "postgres://test/app",
      movementsUrl: MOVEMENTS_URL,
    });
    expect(
      parseLoadGeographyOptions(
        ["--movements-url", "https://exemple.test/m.csv"],
        ENV,
      ).movementsUrl,
    ).toBe("https://exemple.test/m.csv");
  });

  it("exige DATABASE_URL", () => {
    expect(() => parseLoadGeographyOptions([], {})).toThrow(
      "DATABASE_URL est obligatoire",
    );
  });
});

describe("runLoadGeography", () => {
  it("charge départements, communes et anciens codes puis ferme la connexion", async () => {
    const log = vi.fn();
    const movements = `${MOVEMENTS_HEADER}\n"32","2025-01-01","COM","01002","COM","01001"\n`;

    await runLoadGeography([], ENV, fakeFetch(movements), log);

    expect(fake.queries.map(({ sql }) => sql.split(" ")[0])).toContain(
      "insert",
    );
    expect(fake.queries.at(-2)?.params).toEqual(["01002", "01001"]);
    expect(fake.ended).toBe(true);
    expect(log).toHaveBeenCalledWith(
      "0 départements, 1 communes, 1 anciens codes chargés",
    );
  });

  it("liste les anciens codes partis vers une commune disparue", async () => {
    const log = vi.fn();
    const movements = `${MOVEMENTS_HEADER}\n"32","2025-01-01","COM","01003","COM","01009"\n`;

    await runLoadGeography([], ENV, fakeFetch(movements), log);

    expect(log).toHaveBeenCalledWith(
      "0 départements, 1 communes, 0 anciens codes chargés ; sans commune actuelle : 01003",
    );
  });

  it("n'ouvre pas la base si une source est invalide", async () => {
    await expect(
      runLoadGeography([], ENV, fakeFetch(MOVEMENTS_HEADER, {})),
    ).rejects.toThrow("geo.api /departements : tableau attendu");
    expect(fake.urls).toEqual([]);
  });

  it("ferme la connexion même si l'écriture échoue", async () => {
    const db = await import("./store-geography");
    vi.spyOn(db, "replaceGeography").mockRejectedValueOnce(new Error("panne"));

    await expect(
      runLoadGeography([], ENV, fakeFetch(MOVEMENTS_HEADER)),
    ).rejects.toThrow("panne");
    expect(fake.ended).toBe(true);
  });
});
