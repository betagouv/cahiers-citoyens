import { describe, expect, it } from "vitest";
import { parseMovements } from "./movements";

const HEADER =
  '"MOD","DATE_EFF","TYPECOM_AV","COM_AV","LIBELLE_AV","TYPECOM_AP","COM_AP","LIBELLE_AP"';

describe("parseMovements", () => {
  it("garde les colonnes utiles de chaque événement, quel que soit leur ordre", () => {
    const csv = `${HEADER}\r\n"32","2025-01-01","COM","01330","Ancienne, fictive","COM","01187","Nouvelle"\r\n`;

    expect(parseMovements(csv)).toEqual([
      {
        kind: "32",
        effectiveOn: "2025-01-01",
        typeBefore: "COM",
        codeBefore: "01330",
        nameBefore: "Ancienne, fictive",
        typeAfter: "COM",
        codeAfter: "01187",
      },
    ]);
  });

  it("signale une colonne absente", () => {
    expect(() => parseMovements('"MOD","DATE_EFF"\n')).toThrow(
      "COG mouvements : colonne TYPECOM_AV absente",
    );
    expect(() => parseMovements("")).toThrow("colonne MOD absente");
  });

  it("signale une valeur mal formée avec sa ligne", () => {
    const csv = `${HEADER}\n"32","2025-01-01","COM","1330","X","COM","01187","Y"\n"32"`;

    expect(() => parseMovements(csv)).toThrow(
      "COG mouvements, ligne 2 : COM_AV invalide (1330)",
    );
  });

  it("signale une ligne tronquée", () => {
    const csv = `${HEADER}\n"32","2025-01-01"`;

    expect(() => parseMovements(csv)).toThrow(
      "COG mouvements, ligne 2 : 2 colonnes au lieu de 8",
    );
  });

  it("admet une commune absente avant une création", () => {
    const csv = `${HEADER}\n"20","2011-03-31","","","","COM","97601","Créée"`;

    expect(parseMovements(csv)[0]).toMatchObject({
      typeBefore: "",
      codeBefore: "",
      codeAfter: "97601",
    });
  });
});
