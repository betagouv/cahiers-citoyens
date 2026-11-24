import type { ErrorObject } from "ajv/dist/2020";
import type { PageError } from "./errors";

const TYPE_LABELS: Record<string, string> = {
  array: "liste",
  integer: "entier",
  object: "objet",
  string: "texte",
};

function param(params: Record<string, unknown>, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value : JSON.stringify(value);
}

function invalidFieldMessage(
  keyword: string,
  subject: string,
  params: Record<string, unknown>,
): string {
  switch (keyword) {
    case "const":
      return `${subject} doit valoir ${param(params, "allowedValue")}.`;
    case "type": {
      const type = param(params, "type");
      return `${subject} doit être de type ${TYPE_LABELS[type] ?? type}.`;
    }
    case "minLength":
      return `${subject} ne doit pas être vide.`;
    case "minItems":
      return `${subject} doit contenir au moins ${param(params, "limit")} élément.`;
    case "minimum":
      return `${subject} doit être supérieur ou égal à ${param(params, "limit")}.`;
    case "pattern":
      return `${subject} doit respecter le motif ${param(params, "pattern")}.`;
    default:
      return `${subject} est invalide (règle ${keyword}).`;
  }
}

// Une erreur sous `/pages/<i>` est rattachée à la page en position i + 1, et
// le champ est nommé relativement à cette page.
export function schemaErrorToPageError(error: ErrorObject): PageError {
  const segments = error.instancePath.split("/").slice(1);
  const inPage = segments[0] === "pages" && segments.length >= 2;
  const page = inPage ? Number(segments[1]) + 1 : undefined;
  const field = (inPage ? segments.slice(2) : segments).join(".");
  const params: Record<string, unknown> = error.params;

  if (error.keyword === "required") {
    const missing = param(params, "missingProperty");
    return {
      page,
      code: "missing-field",
      message: `Champ obligatoire manquant : ${field ? `${field}.${missing}` : missing}.`,
    };
  }
  if (error.keyword === "additionalProperties") {
    const extra = param(params, "additionalProperty");
    return {
      page,
      code: "unknown-field",
      message: `Champ non prévu par le format : ${field ? `${field}.${extra}` : extra}.`,
    };
  }

  const subject = field
    ? `Le champ ${field}`
    : inPage
      ? "La page"
      : "Le document";
  return {
    page,
    code: "invalid-field",
    message: invalidFieldMessage(error.keyword, subject, params),
  };
}
