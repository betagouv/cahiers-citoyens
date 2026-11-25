import type { ErrorObject } from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import { schemaErrorToPageError } from "./schema-errors";

function ajvError(
  keyword: string,
  instancePath: string,
  params: Record<string, unknown>,
): ErrorObject {
  return { keyword, instancePath, schemaPath: "#", params };
}

describe("schemaErrorToPageError", () => {
  it("nomme un champ manquant à la racine", () => {
    const error = ajvError("required", "", { missingProperty: "pages" });
    expect(schemaErrorToPageError(error)).toEqual({
      page: undefined,
      code: "missing-field",
      message: "Champ obligatoire manquant : pages.",
    });
  });

  it("rattache un champ manquant à la page en position i + 1", () => {
    const error = ajvError("required", "/pages/2", { missingProperty: "text" });
    expect(schemaErrorToPageError(error)).toEqual({
      page: 3,
      code: "missing-field",
      message: "Champ obligatoire manquant : text.",
    });
  });

  it("préfixe le champ manquant par l'objet qui le contient", () => {
    const error = ajvError("required", "/pages/0/meta", {
      missingProperty: "x",
    });
    expect(schemaErrorToPageError(error)).toMatchObject({
      page: 1,
      message: "Champ obligatoire manquant : meta.x.",
    });
  });

  it("préfixe le champ en trop par l'objet qui le contient", () => {
    const error = ajvError("additionalProperties", "/meta", {
      additionalProperty: "x",
    });
    expect(schemaErrorToPageError(error)).toMatchObject({
      page: undefined,
      message: "Champ non prévu par le format : meta.x.",
    });
  });

  it("garde le nom brut d'un type sans libellé", () => {
    const error = ajvError("type", "/format", { type: "boolean" });
    expect(schemaErrorToPageError(error).message).toBe(
      "Le champ format doit être de type boolean.",
    );
  });

  it("signale un champ en trop", () => {
    const error = ajvError("additionalProperties", "/pages/0", {
      additionalProperty: "width",
    });
    expect(schemaErrorToPageError(error)).toEqual({
      page: 1,
      code: "unknown-field",
      message: "Champ non prévu par le format : width.",
    });
  });

  it.each([
    [
      "const",
      "/format",
      { allowedValue: 1 },
      undefined,
      "Le champ format doit valoir 1.",
    ],
    [
      "type",
      "/pages/1/page",
      { type: "integer" },
      2,
      "Le champ page doit être de type entier.",
    ],
    [
      "type",
      "",
      { type: "object" },
      undefined,
      "Le document doit être de type objet.",
    ],
    [
      "type",
      "/pages/4",
      { type: "object" },
      5,
      "La page doit être de type objet.",
    ],
    [
      "minLength",
      "/schema_version",
      { limit: 1 },
      undefined,
      "Le champ schema_version ne doit pas être vide.",
    ],
    [
      "minItems",
      "/pages",
      { limit: 1 },
      undefined,
      "Le champ pages doit contenir au moins 1 élément(s).",
    ],
    [
      "maxItems",
      "/pages/0/lignes/2/polygone/coordinates/0/1",
      { limit: 2 },
      1,
      "Le champ lignes.2.polygone.coordinates.0.1 doit contenir au plus 2 élément(s).",
    ],
    [
      "enum",
      "/pages/0/lignes/0/type_ligne",
      { allowedValues: ["manuscrite", "dactylographiee"] },
      1,
      "Le champ lignes.0.type_ligne doit valoir l'une des valeurs : manuscrite, dactylographiee.",
    ],
    [
      "enum",
      "/metadonnees/type_transcription_manuscrite",
      { allowedValues: "?" },
      undefined,
      "Le champ metadonnees.type_transcription_manuscrite doit valoir l'une des valeurs : .",
    ],
    [
      "type",
      "/pages/0/lignes/0/polygone/coordinates/0/0/1",
      { type: "number" },
      1,
      "Le champ lignes.0.polygone.coordinates.0.0.1 doit être de type nombre.",
    ],
    [
      "minimum",
      "/pages/0/page",
      { limit: 1 },
      1,
      "Le champ page doit être supérieur ou égal à 1.",
    ],
    [
      "pattern",
      "/pages/1/image",
      { pattern: "^[A-Za-z0-9._-]+\\.png$" },
      2,
      "Le champ image doit respecter le motif ^[A-Za-z0-9._-]+\\.png$.",
    ],
    [
      "maxLength",
      "/text",
      { limit: 3 },
      undefined,
      "Le champ text est invalide (règle maxLength).",
    ],
  ])("traduit %s sur %j", (keyword, path, params, page, message) => {
    expect(schemaErrorToPageError(ajvError(keyword, path, params))).toEqual({
      page,
      code: "invalid-field",
      message,
    });
  });
});
