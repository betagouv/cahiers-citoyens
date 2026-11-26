import { describe, expect, it } from "vitest";
import { checkEntryHeader, printableName } from "./entry-name";

const FILE = 0o100644 << 16;

function check(name: string, externalFileAttributes = FILE) {
  return checkEntryHeader({ name, externalFileAttributes });
}

describe("checkEntryHeader", () => {
  it("accepte un fichier à la racine", () => {
    expect(check("CC_1.json")).toBeNull();
    expect(check("CC_1_1.png", 0)).toBeNull();
  });

  it.each([
    ["", "le nom est vide"],
    ["CC_1\n.json", "le nom contient un caractère de contrôle"],
    ["CC\u007f.json", "le nom contient un caractère de contrôle"],
    ["scans\\CC_1_1.png", "le nom contient une barre oblique inverse"],
    ["/etc/passwd", "le chemin est absolu"],
    ["C:CC_1.json", "le chemin est absolu"],
    ["../../escape.txt", "le chemin contient « .. »"],
    ["a/../CC_1.json", "le chemin contient « .. »"],
  ])("refuse le nom %j", (name, reason) => {
    const file = printableName(name);
    expect(check(name)).toEqual({
      file,
      code: "invalid-entry-name",
      message: `Fichier ${file} refusé : ${reason}.`,
    });
  });

  it("montre les caractères de contrôle en \\xNN", () => {
    expect(printableName("a\nb\u007f")).toBe("a\\x0ab\\x7f");
  });

  it("refuse les dossiers et les sous-dossiers", () => {
    expect(check("scans/")).toEqual({
      file: "scans/",
      code: "nested-entry",
      message: "Fichier scans/ refusé : le ZIP ne doit contenir aucun dossier.",
    });
    expect(check("scans", 0o40755 << 16)?.code).toBe("nested-entry");
    expect(check("scans/CC_1_1.png")).toEqual({
      file: "scans/CC_1_1.png",
      code: "nested-entry",
      message:
        "Fichier scans/CC_1_1.png refusé : tous les fichiers doivent être à la racine du ZIP.",
    });
  });

  it("refuse un lien symbolique", () => {
    expect(check("CC_1_1.png", (0o120777 << 16) >>> 0)).toEqual({
      file: "CC_1_1.png",
      code: "symlink-entry",
      message: "Fichier CC_1_1.png refusé : c'est un lien symbolique.",
    });
  });
});
