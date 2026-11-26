import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NOTEBOOKS_PAGE_SIZE,
  getNotebook,
  listNotebooks,
  notebookExists,
  notebookIdFromPath,
  parsePageNumber,
} from "./notebooks";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));
vi.stubEnv("DATABASE_URL", "postgres://test/app");

beforeEach(() => {
  fake.reset();
});

describe("parsePageNumber", () => {
  it("lit un entier positif", () => {
    expect(parsePageNumber("3")).toBe(3);
    expect(parsePageNumber(["2", "5"])).toBe(2);
  });

  it("ramène à la page 1 toute autre valeur", () => {
    expect(parsePageNumber(undefined)).toBe(1);
    expect(parsePageNumber("0")).toBe(1);
    expect(parsePageNumber("-2")).toBe(1);
    expect(parsePageNumber("1.5")).toBe(1);
    expect(parsePageNumber("abc")).toBe(1);
  });
});

describe("notebookIdFromPath", () => {
  it("lit l'identifiant d'une page de cahier", () => {
    expect(notebookIdFromPath("/notebooks/notebook-0001")).toBe(
      "notebook-0001",
    );
    expect(notebookIdFromPath("/notebooks/cahier%20%C3%A9t%C3%A9")).toBe(
      "cahier été",
    );
  });

  it("ignore les autres chemins", () => {
    expect(notebookIdFromPath("/notebooks")).toBeUndefined();
    expect(notebookIdFromPath("/notebooks/")).toBeUndefined();
    expect(notebookIdFromPath("/notebooks/notebook-0001/scan")).toBeUndefined();
    expect(notebookIdFromPath("/search")).toBeUndefined();
  });

  it("ignore un encodage invalide", () => {
    expect(notebookIdFromPath("/notebooks/%E0%A4%A")).toBeUndefined();
  });
});

describe("listNotebooks", () => {
  it("renvoie la page demandée, avec le lieu et le nombre de pages de chaque cahier", async () => {
    fake.reply([["45"]], [["CC_21", "Exempleville", "Ain", "01", "3"]]);

    await expect(listNotebooks(2)).resolves.toEqual({
      notebooks: [
        {
          id: "CC_21",
          municipalityName: "Exempleville",
          departmentName: "Ain",
          departmentCode: "01",
          pageCount: 3,
        },
      ],
      page: 2,
      pageCount: 3,
      total: 45,
    });
    const [countQuery, pageQuery] = fake.queries;
    expect(countQuery.sql).toContain('where "notebooks"."status" = $1');
    expect(pageQuery.sql).toContain('order by "notebooks"."id" asc');
    expect(pageQuery.params).toEqual(["published", NOTEBOOKS_PAGE_SIZE, 20]);
  });

  it("ramène une page trop grande à la dernière page", async () => {
    fake.reply([["45"]], []);

    const result = await listNotebooks(9);

    expect(result.page).toBe(3);
    expect(fake.queries[1].params).toEqual([
      "published",
      NOTEBOOKS_PAGE_SIZE,
      40,
    ]);
  });

  it("compte une page même sans cahier", async () => {
    fake.reply([["0"]], []);

    await expect(listNotebooks(1)).resolves.toEqual({
      notebooks: [],
      page: 1,
      pageCount: 1,
      total: 0,
    });
  });
});

describe("getNotebook", () => {
  it("renvoie le cahier publié et ses pages dans l'ordre", async () => {
    fake.reply(
      [["CC_1", "2", "Exempleville", "Ain", "01"]],
      [
        ["1", "1200", "1700", "Première ligne\nSeconde ligne"],
        ["3", "1200", "1700", ""],
      ],
    );

    await expect(getNotebook("CC_1")).resolves.toEqual({
      id: "CC_1",
      onlineVersion: 2,
      municipalityName: "Exempleville",
      departmentName: "Ain",
      departmentCode: "01",
      pages: [
        {
          number: 1,
          width: 1200,
          height: 1700,
          text: "Première ligne\nSeconde ligne",
        },
        { number: 3, width: 1200, height: 1700, text: "" },
      ],
    });
    const [notebookQuery, pagesQuery] = fake.queries;
    expect(notebookQuery.params).toEqual(["CC_1", "published"]);
    expect(pagesQuery.sql).toContain('order by "pages"."number" asc');
    expect(pagesQuery.params).toEqual(["CC_1", "published"]);
  });

  it("renvoie undefined pour un cahier inconnu ou retiré", async () => {
    await expect(getNotebook("inconnu")).resolves.toBeUndefined();
  });
});

describe("notebookExists", () => {
  it("vrai si une ligne porte cet id", async () => {
    fake.reply([["notebook-0001"]]);

    await expect(notebookExists("notebook-0001")).resolves.toBe(true);
    expect(fake.queries[0].sql).toContain(
      'where ("notebooks"."id" = $1 and "notebooks"."status" = $2)',
    );
    expect(fake.queries[0].params).toEqual(["notebook-0001", "published", 1]);
  });

  it("faux sinon", async () => {
    await expect(notebookExists("inconnu")).resolves.toBe(false);
  });
});
