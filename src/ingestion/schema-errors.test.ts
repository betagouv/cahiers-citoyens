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
      "/source_filename",
      { limit: 1 },
      undefined,
      "Le champ source_filename ne doit pas être vide.",
    ],
    [
      "minItems",
      "/pages",
      { limit: 1 },
      undefined,
      "Le champ pages doit contenir au moins 1 élément.",
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
