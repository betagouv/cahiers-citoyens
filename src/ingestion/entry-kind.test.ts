import { describe, expect, it } from "vitest";
import { entryKind } from "./entry-kind";

function unlisted(name: string) {
  return {
    kind: "rejected",
    error: {
      file: name,
      code: "unlisted-file",
      message: `Fichier en trop : ${name} n'est ni <id_cahier>.json ni une image <id_cahier>_<numero_page>.png, .jpg ou .jpeg.`,
    },
  };
}

describe("entryKind", () => {
  it("reconnaît le JSON d'un cahier", () => {
    expect(entryKind("CC_01500_190318_01004_MD_16116.json")).toEqual({
      kind: "json",
      id: "CC_01500_190318_01004_MD_16116",
    });
  });

  it("prend le dernier _<n> comme numéro de page, extension sans casse", () => {
    expect(entryKind("CC_01500_190318_01004_MD_16116_3.png")).toEqual({
      kind: "image",
      id: "CC_01500_190318_01004_MD_16116",
      page: 3,
    });
    expect(entryKind("CC_1_12.JPG")).toEqual({
      kind: "image",
      id: "CC_1",
      page: 12,
    });
    expect(entryKind("CC_1_2.jpeg")).toMatchObject({ page: 2 });
  });

  it("refuse un JSON dont le nom n'est pas un identifiant", () => {
    expect(entryKind("é.json")).toMatchObject({
      kind: "rejected",
      error: {
        notebook: "é",
        file: "é.json",
        code: "invalid-notebook-id",
      },
    });
  });

  it.each([
    "notes.txt",
    "CC_1.JSON",
    "CC.png",
    "CC_1_0.png",
    "CC_1_03.png",
    "CC_1_2.gif",
    "_1.png",
    "-x_1.png",
    "CC_1_99999999999999999999.png",
  ])("signale %s comme fichier en trop", (name) => {
    expect(entryKind(name)).toEqual(unlisted(name));
  });
});
