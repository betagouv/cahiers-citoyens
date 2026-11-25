import { describe, expect, it } from "vitest";
import { checkNotebook } from "./notebook-checks";
import { type NotebookId, parseNotebookId } from "./notebook-id";

function notebookId(): NotebookId {
  const result = parseNotebookId("CC_1");
  if (!result.ok) throw new Error(result.error.message);
  return result.id;
}

function page(number: unknown, lineCount = 1, id = `CC_1_${String(number)}`) {
  return {
    numero_page: number,
    id_page: id,
    lignes: Array.from({ length: lineCount }, (_, i) => ({
      id_ligne: `${id}_${i + 1}`,
    })),
  };
}

function check(pages: unknown, idCahier: unknown = "CC_1") {
  return checkNotebook(notebookId(), { id_cahier: idCahier, pages });
}

function codes(pages: unknown, idCahier?: unknown) {
  return check(pages, idCahier).map(({ code, page }) => ({ code, page }));
}

describe("checkNotebook, cas valides", () => {
  it("accepte des pages croissantes, avec des trous", () => {
    expect(check([page(1, 2), page(5, 0), page(7, 3)])).toEqual([]);
  });

  it("ignore ce que le schéma signale déjà", () => {
    expect(checkNotebook(notebookId(), null)).toEqual([]);
    expect(checkNotebook(notebookId(), [])).toEqual([]);
    expect(check("pages", 12)).toEqual([]);
    expect(check([null, "x", { numero_page: "2", id_page: 3 }])).toEqual([]);
    expect(
      check([
        { numero_page: 1, id_page: "CC_1_1", lignes: [null, { id_ligne: 4 }] },
      ]),
    ).toEqual([]);
    expect(check([{ numero_page: 1.5, id_page: "autre" }])).toEqual([]);
    expect(check([{ numero_page: 0, id_page: "autre" }, page(1)])).toEqual([]);
  });
});

describe("checkNotebook, identifiants", () => {
  it("exige que id_cahier reprenne le nom du fichier", () => {
    expect(check([page(1)], "CC_2")).toEqual([
      {
        code: "notebook-id-mismatch",
        message:
          "id_cahier vaut CC_2, CC_1 attendu : il doit reprendre le nom du fichier JSON.",
      },
    ]);
  });

  it("exige id_page = <id_cahier>_<numero_page>", () => {
    expect(check([page(1), page(2, 0, "CC_1_02")])).toEqual([
      {
        page: 2,
        code: "invalid-page-id",
        message:
          "id_page vaut CC_1_02, CC_1_2 attendu (<id_cahier>_<numero_page>).",
      },
    ]);
  });

  it("exige que chaque id_ligne commence par l'id de la page", () => {
    const pages = [
      page(1),
      {
        numero_page: 2,
        id_page: "CC_1_2",
        lignes: [{ id_ligne: "CC_1_2_1" }, { id_ligne: "CC_1_22" }],
      },
    ];
    expect(check(pages)).toEqual([
      {
        page: 2,
        code: "invalid-line-id",
        message:
          "La ligne en position 2 a pour id_ligne CC_1_22, qui doit commencer par CC_1_2_.",
      },
    ]);
  });

  it("compare les lignes au numéro de page, pas à id_page", () => {
    expect(codes([page(1, 2, "CC_1_x")])).toEqual([
      { code: "invalid-page-id", page: 1 },
      { code: "invalid-line-id", page: 1 },
      { code: "invalid-line-id", page: 1 },
    ]);
  });
});

describe("checkNotebook, numéros de page", () => {
  it("refuse une page en double", () => {
    expect(check([page(1), page(2), page(2)])).toEqual([
      {
        page: 3,
        code: "duplicate-page",
        message: "La page 2 apparaît plusieurs fois.",
      },
    ]);
  });

  it("refuse une page qui recule", () => {
    expect(check([page(1), page(4), page(3)])).toEqual([
      {
        page: 3,
        code: "page-out-of-order",
        message:
          "La page 3 suit la page 4 : les numéros de page doivent croître.",
      },
    ]);
  });

  it("compare chaque page à la plus haute déjà vue", () => {
    expect(codes([page(5), page(2), page(3), page(2), page(6)])).toEqual([
      { code: "page-out-of-order", page: 2 },
      { code: "page-out-of-order", page: 3 },
      { code: "duplicate-page", page: 4 },
    ]);
  });

  it("liste toutes les erreurs ensemble, dans l'ordre des pages", () => {
    expect(codes([page(2, 1, "x"), page(1)], "CC_9")).toEqual([
      { code: "notebook-id-mismatch", page: undefined },
      { code: "invalid-page-id", page: 1 },
      { code: "invalid-line-id", page: 1 },
      { code: "page-out-of-order", page: 2 },
    ]);
  });
});
