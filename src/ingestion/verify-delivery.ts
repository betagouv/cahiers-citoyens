import { basename } from "node:path";
import { readArchiveContents } from "./archive-contents";
import { checkDeliveryName } from "./delivery-name";
import type { IngestError } from "./errors";
import { type VerifiedNotebook, verifyNotebook } from "./verify-notebook";

export interface VerifiedDelivery {
  name: string;
  notebooks: VerifiedNotebook[];
}

export type VerificationResult =
  | { ok: true; delivery: VerifiedDelivery }
  | { ok: false; errors: IngestError[] };

function emptyDelivery(name: string): IngestError {
  return {
    file: name,
    code: "empty-delivery",
    message: `${name} ne contient aucun cahier.`,
  };
}

// Tout ou rien : le dépôt n'est retenu que si aucun contrôle n'échoue, et
// le rapport liste toutes les erreurs de tous les cahiers.
export async function verifyDelivery(
  zipPath: string,
): Promise<VerificationResult> {
  const name = basename(zipPath);
  const contents = await readArchiveContents(zipPath, name);
  const results = contents.notebooks.map(verifyNotebook);
  const notebooks = results.flatMap((r) => (r.ok ? [r.notebook] : []));
  const errors = [
    ...checkDeliveryName(name),
    ...contents.errors,
    ...results.flatMap((r) => (r.ok ? [] : r.errors)),
  ];
  if (errors.length === 0 && notebooks.length === 0) {
    errors.push(emptyDelivery(name));
  }
  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, delivery: { name, notebooks } };
}
