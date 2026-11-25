import { parseCsv } from "./csv";

// Une ligne du fichier « événements survenus aux communes » du Code officiel
// géographique de l'Insee (`v_mvt_commune_<millésime>.csv`).
export interface Movement {
  // Type d'événement (MOD) : 32 création de commune nouvelle, 41 changement
  // de code dû à un changement de département…
  kind: string;
  effectiveOn: string;
  typeBefore: string;
  codeBefore: string;
  typeAfter: string;
  codeAfter: string;
}

interface Column {
  name: string;
  pattern: RegExp;
}

// Vides avant une création (MOD 20) ou après une suppression (MOD 30).
const COMMUNE_CODE = /^([0-9][0-9AB]\d{3})?$/;
const COMMUNE_TYPE = /^([A-Z]+)?$/;

const COLUMNS: Record<keyof Movement, Column> = {
  kind: { name: "MOD", pattern: /^\d{2}$/ },
  effectiveOn: { name: "DATE_EFF", pattern: /^\d{4}-\d{2}-\d{2}$/ },
  typeBefore: { name: "TYPECOM_AV", pattern: COMMUNE_TYPE },
  codeBefore: { name: "COM_AV", pattern: COMMUNE_CODE },
  typeAfter: { name: "TYPECOM_AP", pattern: COMMUNE_TYPE },
  codeAfter: { name: "COM_AP", pattern: COMMUNE_CODE },
};

function columnReader(
  header: string[],
  { name, pattern }: Column,
): (row: string[], lineNumber: number) => string {
  const index = header.indexOf(name);
  if (index === -1) throw new Error(`COG mouvements : colonne ${name} absente`);
  return function read(row, lineNumber) {
    const value = row[index];
    if (!pattern.test(value)) {
      throw new Error(
        `COG mouvements, ligne ${lineNumber} : ${name} invalide (${value})`,
      );
    }
    return value;
  };
}

export function parseMovements(csv: string): Movement[] {
  const [header = [], ...rows] = parseCsv(csv);
  const kind = columnReader(header, COLUMNS.kind);
  const effectiveOn = columnReader(header, COLUMNS.effectiveOn);
  const typeBefore = columnReader(header, COLUMNS.typeBefore);
  const codeBefore = columnReader(header, COLUMNS.codeBefore);
  const typeAfter = columnReader(header, COLUMNS.typeAfter);
  const codeAfter = columnReader(header, COLUMNS.codeAfter);
  return rows.map((row, i) => {
    const lineNumber = i + 2;
    if (row.length !== header.length) {
      throw new Error(
        `COG mouvements, ligne ${lineNumber} : ${row.length} colonnes au lieu de ${header.length}`,
      );
    }
    return {
      kind: kind(row, lineNumber),
      effectiveOn: effectiveOn(row, lineNumber),
      typeBefore: typeBefore(row, lineNumber),
      codeBefore: codeBefore(row, lineNumber),
      typeAfter: typeAfter(row, lineNumber),
      codeAfter: codeAfter(row, lineNumber),
    };
  });
}
