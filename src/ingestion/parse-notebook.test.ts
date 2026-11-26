import { describe, expect, it } from "vitest";
import type { IngestErrorCode } from "./errors";
import { type NotebookId, parseNotebookId } from "./notebook-id";
import { type ParseNotebookResult, parseNotebook } from "./parse-notebook";
import { EXAMPLE_ID, exampleNotebook } from "./test-notebook";

function exampleId(): NotebookId {
  const result = parseNotebookId(EXAMPLE_ID);
  if (!result.ok) throw new Error(result.error.message);
  return result.id;
}

function parse(value: unknown): ParseNotebookResult {
  return parseNotebook(exampleId(), JSON.stringify(value));
}

function errorsOf(result: ParseNotebookResult) {
  if (result.ok) throw new Error("le parseur aurait dû refuser ce JSON");
  return result.errors.map(({ code, position }) => ({ code, position }));
}

function only(code: IngestErrorCode, position?: number) {
  return [{ code, position }];
}

type Key = string | number;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function child(value: unknown, key: Key): unknown {
  if (Array.isArray(value)) return value[Number(key)];
  if (isRecord(value)) return value[key];
  throw new Error(`chemin introuvable : ${key}`);
}

// Copie de l'exemple avec une valeur remplacée ; `undefined` retire le champ.
function withValue(path: Key[], value: unknown): unknown {
  const root: unknown = JSON.parse(JSON.stringify(exampleNotebook()));
  const parent = path.slice(0, -1).reduce(child, root);
  const last = path[path.length - 1];
  if (Array.isArray(parent)) parent[Number(last)] = value;
  else if (isRecord(parent)) parent[last] = value;
  return root;
}

const LINE = ["pages", 0, "lignes", 0];
const RING = [...LINE, "polygone", "coordinates", 0];

describe("parseNotebook, document valide", () => {
  it("lit l'exemple du protocole et garde schema_version tel quel", () => {
    const result = parse(exampleNotebook());
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    expect(result.notebook.schemaVersion).toBe("Campus Condorcet");
    expect(result.notebook.pages.map(({ number }) => number)).toEqual([1, 3]);
    expect(result.notebook.pages[0].lines[0].zone).toBeNull();
  });

  it("accepte des coordonnées décimales et une zone libre", () => {
    expect(parse(withValue([...RING, 1], [904.5, 282.25])).ok).toBe(true);
    expect(parse(withValue([...LINE, "type_zone"], "Signature")).ok).toBe(true);
  });
});

describe("parseNotebook, erreurs localisées", () => {
  it("refuse un JSON invalide", () => {
    const result = parseNotebook(exampleId(), '{ "id_cahier": ');
    if (result.ok) throw new Error("JSON accepté");
    expect(result.errors).toHaveLength(1);
    const [error] = result.errors;
    expect(error).toMatchObject({
      notebook: EXAMPLE_ID,
      file: `${EXAMPLE_ID}.json`,
      code: "invalid-json",
    });
    expect(error.message).toMatch(
      /^CC_01500_190318_01004_MD_16116\.json n'est pas un JSON valide \(SyntaxError/,
    );
  });

  it("rattache chaque erreur au cahier et au fichier JSON", () => {
    expect(parse(withValue(["schema_version"], ""))).toEqual({
      ok: false,
      errors: [
        {
          notebook: EXAMPLE_ID,
          file: `${EXAMPLE_ID}.json`,
          position: undefined,
          code: "invalid-field",
          message: "Le champ schema_version ne doit pas être vide.",
        },
      ],
    });
  });

  it("refuse un champ manquant dans une ligne", () => {
    const raw = withValue([...LINE, "transcription"], undefined);
    expect(errorsOf(parse(raw))).toEqual(only("missing-field", 1));
  });

  it("refuse un champ en trop dans les métadonnées", () => {
    const raw = withValue(["metadonnees", "region"], "Auvergne");
    expect(errorsOf(parse(raw))).toEqual(only("unknown-field"));
  });
});

describe("parseNotebook, valeurs refusées par le schéma", () => {
  it.each<[string, Key[], unknown, number | undefined]>([
    ["type_ligne inconnu", [...LINE, "type_ligne"], "imprimee", 1],
    [
      "mode de transcription inconnu",
      ["metadonnees", "type_transcription_manuscrite"],
      "auto",
      undefined,
    ],
    ["code INSEE mal formé", ["metadonnees", "code_insee"], "1004", undefined],
    [
      "code postal mal formé",
      ["metadonnees", "code_postal"],
      "1500",
      undefined,
    ],
    [
      "numéro de département mal formé",
      ["metadonnees", "numero_departement"],
      "1",
      undefined,
    ],
    ["numéro de page nul", ["pages", 0, "numero_page"], 0, 1],
    ["largeur décimale", ["pages", 1, "largeur"], 10.5, 2],
    ["polygone d'un autre type", [...LINE, "polygone", "type"], "Point", 1],
    [
      "anneau de trois points",
      RING,
      [
        [1, 1],
        [2, 2],
        [1, 1],
      ],
      1,
    ],
    ["coordonnée négative", [...RING, 0], [-1, 282], 1],
    ["point à trois coordonnées", [...RING, 0], [1, 2, 3], 1],
  ])("%s", (_label, path, value, position) => {
    expect(errorsOf(parse(withValue(path, value)))).toEqual(
      only("invalid-field", position),
    );
  });

  it("refuse une liste de pages vide", () => {
    expect(errorsOf(parse({ ...exampleNotebook(), pages: [] }))).toEqual(
      only("invalid-field"),
    );
  });
});

describe("parseNotebook, contrôles hors schéma", () => {
  it("refuse un id_cahier qui ne reprend pas le nom du fichier", () => {
    const raw = withValue(["id_cahier"], "CC_01500_190318_01004_MD_16117");
    expect(errorsOf(parse(raw))).toEqual(only("notebook-id-mismatch"));
  });

  it("liste ensemble erreurs de schéma et contrôles hors schéma", () => {
    const base = withValue(["pages", 1, "numero_page"], 1);
    const page1 = child(child(base, "pages"), 0);
    const lines = child(page1, "lignes");
    const first = child(lines, 0);
    const second = child(lines, 1);
    if (!isRecord(first) || !isRecord(second)) throw new Error("lignes");
    delete first.polygone;
    second.id_ligne = "x";
    expect(errorsOf(parse(base))).toEqual([
      { code: "missing-field", position: 1 },
      { code: "invalid-line-id", position: 1 },
      { code: "invalid-page-id", position: 2 },
      { code: "duplicate-page", position: 2 },
    ]);
  });
});
