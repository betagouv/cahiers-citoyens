import type { Sha256 } from "./fingerprint";
import type { ImageContentType } from "./notebook";
import type { NotebookStatus } from "./notebook-status";
import { IMAGE_CONTENT_TYPE, pageImageKey } from "./storage-keys";
import type { VerifiedDelivery } from "./verify-delivery";
import type { VerifiedNotebook } from "./verify-notebook";

// État en base d'un cahier du dépôt. Lu pour planifier, puis relu sous verrou
// dans la transaction : un écart veut dire qu'un autre traitement est passé
// entre-temps, et le plan n'est plus valable.
export interface NotebookState {
  status: NotebookStatus;
  // Vide pour un cahier chargé par `scripts/load.ts`.
  onlineVersion: number | null;
  // Empreinte de la version en ligne, vide sans version.
  fingerprint: string | null;
  // Plus grand numéro de version attribué, 0 s'il n'y en a aucun.
  latestVersion: number;
  // Images des pages en base, dans l'ordre des pages.
  imageKeys: string[];
}

export interface ImageUpload {
  page: number;
  key: string;
  // Fichier du ZIP à copier, et ce que la vérification en a lu.
  entryName: string;
  contentType: ImageContentType;
  sha256: Sha256;
  bytes: number;
}

interface NotebookWrite {
  verified: VerifiedNotebook;
  version: number;
  // Une image par page, dans l'ordre des pages.
  uploads: ImageUpload[];
  // Images de la version remplacée, supprimées après le commit.
  removedKeys: string[];
}

export interface Publish extends NotebookWrite {
  kind: "publish";
  current: null;
}

export interface Replace extends NotebookWrite {
  kind: "replace";
  current: NotebookState;
}

export interface Republish extends NotebookWrite {
  kind: "republish";
  current: NotebookState;
}

export interface Unchanged {
  kind: "unchanged";
  verified: VerifiedNotebook;
  current: NotebookState;
}

export type WriteChange = Publish | Replace | Republish;
export type Change = WriteChange | Unchanged;

export interface ChangePlan {
  delivery: VerifiedDelivery;
  changes: Change[];
}

export interface PlanCounts {
  published: number;
  replaced: number;
  unchanged: number;
}

function uploads(verified: VerifiedNotebook, version: number): ImageUpload[] {
  return verified.images.map((image) => ({
    page: image.page,
    key: pageImageKey(verified.notebook.id, version, image.page, image.type),
    entryName: image.entryName,
    contentType: IMAGE_CONTENT_TYPE[image.type],
    sha256: image.sha256,
    bytes: image.bytes,
  }));
}

function write(
  verified: VerifiedNotebook,
  version: number,
  removedKeys: string[],
) {
  return {
    verified,
    version,
    uploads: uploads(verified, version),
    removedKeys,
  };
}

function change(
  verified: VerifiedNotebook,
  current: NotebookState | undefined,
): Change {
  if (current === undefined) {
    return { kind: "publish", current: null, ...write(verified, 1, []) };
  }
  const next = write(verified, current.latestVersion + 1, current.imageKeys);
  if (current.status === "withdrawn") {
    return { kind: "republish", current, ...next };
  }
  if (current.fingerprint === verified.fingerprint) {
    return { kind: "unchanged", verified, current };
  }
  return { kind: "replace", current, ...next };
}

// Un changement par cahier du dépôt, dans l'ordre du dépôt. Un cahier absent
// du dépôt n'apparaît pas : il reste tel quel. Les numéros de version sont les
// nôtres : le plus grand déjà attribué, plus un.
export function planChanges(
  delivery: VerifiedDelivery,
  states: ReadonlyMap<string, NotebookState>,
): ChangePlan {
  return {
    delivery,
    changes: delivery.notebooks.map((verified) =>
      change(verified, states.get(verified.notebook.id)),
    ),
  };
}

export function isWrite(change: Change): change is WriteChange {
  return change.kind !== "unchanged";
}

// Compteurs du dépôt : un cahier republié après un retrait compte comme publié.
export function planCounts({ changes }: ChangePlan): PlanCounts {
  function count(...kinds: Change["kind"][]): number {
    return changes.filter(({ kind }) => kinds.includes(kind)).length;
  }
  return {
    published: count("publish", "republish"),
    replaced: count("replace"),
    unchanged: count("unchanged"),
  };
}
