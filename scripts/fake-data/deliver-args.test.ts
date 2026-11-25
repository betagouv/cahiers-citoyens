import { describe, expect, it } from "vitest";
import { DEFAULT_CREATED_AT, parseDeliverArgs } from "./deliver-args";

describe("parseDeliverArgs", () => {
  it("a des valeurs par défaut déterministes", () => {
    expect(parseDeliverArgs([])).toEqual({
      out: "data/deliveries",
      options: {
        count: 10,
        seed: "42",
        createdAt: new Date(DEFAULT_CREATED_AT),
        modify: 0,
        gaps: false,
        defects: [],
      },
    });
  });

  it("lit chaque option, --defect répétable", () => {
    expect(
      parseDeliverArgs([
        "--count",
        "3",
        "--seed",
        "7",
        "--out",
        "tmp",
        "--created-at",
        "2026-12-01T08:15:00Z",
        "--modify",
        "3",
        "--gaps",
        "--defect",
        "duplicate-page",
        "--defect",
        "invalid-image",
      ]),
    ).toEqual({
      out: "tmp",
      options: {
        count: 3,
        seed: "7",
        createdAt: new Date("2026-12-01T08:15:00Z"),
        modify: 3,
        gaps: true,
        defects: ["duplicate-page", "invalid-image"],
      },
    });
  });
});

describe("parseDeliverArgs, valeurs refusées", () => {
  it("refuse un nombre de cahiers hors bornes ou une modification de trop", () => {
    expect(() => parseDeliverArgs(["--count", "0"])).toThrow("--count");
    expect(() => parseDeliverArgs(["--count", "2.5"])).toThrow("--count");
    expect(() => parseDeliverArgs(["--count", "10000"])).toThrow("--count");
    expect(() => parseDeliverArgs(["--count", "2", "--modify", "3"])).toThrow(
      "--modify doit être un entier entre 0 et 2",
    );
  });

  it("exige une date UTC valide", () => {
    expect(() =>
      parseDeliverArgs(["--created-at", "2026-11-24T09:30:00"]),
    ).toThrow("--created-at");
    expect(() => parseDeliverArgs(["--created-at", "demainZ"])).toThrow(
      "--created-at",
    );
  });

  it("refuse un défaut inconnu en listant les défauts possibles", () => {
    expect(() => parseDeliverArgs(["--defect", "missing-page"])).toThrow(
      "--defect inconnu : missing-page (attendu : missing-image, unlisted-file",
    );
  });
});
