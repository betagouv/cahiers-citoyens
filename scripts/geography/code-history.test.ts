import { describe, expect, it } from "vitest";
import { resolveCodeHistory } from "./code-history";
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
      changes: [{ oldCode: "01002", currentCode: "01001" }],
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

    expect(history.changes).toEqual([
      { oldCode: "02200", currentCode: "02100" },
      { oldCode: "02300", currentCode: "02100" },
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
