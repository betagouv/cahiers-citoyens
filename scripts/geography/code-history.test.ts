import { describe, expect, it } from "vitest";
import { departmentOfCode, resolveCodeHistory } from "./code-history";
import type { Movement } from "./movements";

function movement(
  codeBefore: string,
  codeAfter: string,
  effectiveOn: string,
  overrides: Partial<Movement> = {},
): Movement {
  return {
    kind: "32",
    effectiveOn,
    typeBefore: "COM",
    codeBefore,
    nameBefore: `Commune ${codeBefore}`,
    typeAfter: "COM",
    codeAfter,
    ...overrides,
  };
}

describe("resolveCodeHistory", () => {
  it("associe une commune fusionnée après 2019 à sa commune nouvelle", () => {
    const history = resolveCodeHistory(
      [
        movement("01002", "01001", "2025-01-01"),
        movement("01001", "01001", "2025-01-01"),
        movement("01002", "01002", "2025-01-01", { typeAfter: "COMD" }),
      ],
      new Set(["01001"]),
    );

    expect(history).toEqual({
      changes: [
        {
          oldCode: "01002",
          currentCode: "01001",
          name: "Commune 01002",
          departmentCode: "01",
          searchName: "commune 01002",
        },
      ],
      unresolved: [],
    });
  });

  it("suit plusieurs changements dans l'ordre des dates", () => {
    const history = resolveCodeHistory(
      [
        movement("02200", "02100", "2023-01-01", { kind: "41" }),
        movement("02300", "02200", "2020-01-01"),
      ],
      new Set(["02100"]),
    );

    expect(
      history.changes.map(({ oldCode, currentCode }) => [oldCode, currentCode]),
    ).toEqual([
      ["02200", "02100"],
      ["02300", "02100"],
    ]);
  });

  it("ignore les événements de 2019 et avant, et ceux qui ne changent pas de code", () => {
    const history = resolveCodeHistory(
      [
        movement("03002", "03001", "2019-01-01"),
        movement("03003", "03001", "2021-01-01", { kind: "21" }),
        movement("03004", "03001", "2021-01-01", { typeBefore: "COMD" }),
      ],
      new Set(["03001"]),
    );

    expect(history).toEqual({ changes: [], unresolved: [] });
  });

  it("garde le nom de 2019, même renommée avant sa fusion", () => {
    const history = resolveCodeHistory(
      [
        movement("06002", "06001", "2024-01-01", {
          nameBefore: "Nom Récent",
        }),
        movement("06002", "06002", "2021-01-01", {
          kind: "10",
          nameBefore: "L'Ancien Nom-Fictif",
        }),
      ],
      new Set(["06001"]),
    );

    expect(history.changes).toEqual([
      {
        oldCode: "06002",
        currentCode: "06001",
        name: "L'Ancien Nom-Fictif",
        departmentCode: "06",
        searchName: "l ancien nom fictif",
      },
    ]);
  });

  it("ne reprend pas un code encore actuel", () => {
    const history = resolveCodeHistory(
      [movement("04002", "04001", "2020-01-01")],
      new Set(["04001", "04002"]),
    );

    expect(history.changes).toEqual([]);
  });

  it("signale un code parti vers une commune qui n'existe plus, cycle compris", () => {
    const history = resolveCodeHistory(
      [
        movement("05002", "05003", "2020-01-01"),
        movement("05003", "05002", "2021-01-01"),
        movement("05004", "05005", "2020-01-01"),
      ],
      new Set(["05001"]),
    );

    expect(history).toEqual({
      changes: [],
      unresolved: ["05002", "05003", "05004"],
    });
  });
});

describe("departmentOfCode", () => {
  it("lit deux caractères en métropole et en Corse, trois outre-mer", () => {
    expect(departmentOfCode("01039")).toBe("01");
    expect(departmentOfCode("2A004")).toBe("2A");
    expect(departmentOfCode("97411")).toBe("974");
    expect(departmentOfCode("98735")).toBe("987");
  });
});
