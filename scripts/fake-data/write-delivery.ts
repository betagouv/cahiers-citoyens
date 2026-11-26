import { createWriteStream } from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { deliveryEntries } from "./delivery-entries";
import { deliveryFileName } from "../../src/ingestion/delivery-name";
import type { DeliverySpec, NotebookSpec } from "./delivery-plan";
import { writeArchive } from "./write-archive";

export function describeNotebook(notebook: NotebookSpec): string | null {
  const notes = [
    ...(notebook.change === "none" ? [] : [`modifié (${notebook.change})`]),
    ...notebook.defects,
  ];
  return notes.length === 0 ? null : `${notebook.id} : ${notes.join(", ")}`;
}

// Écrit d'abord un fichier `.partial` : un ZIP au nom final est toujours complet.
export async function writeDelivery(
  spec: DeliverySpec,
  out: string,
): Promise<string> {
  const path = join(out, deliveryFileName(spec.createdAt));
  const partial = `${path}.partial`;
  await mkdir(out, { recursive: true });
  await writeArchive(
    deliveryEntries(spec),
    spec.createdAt,
    createWriteStream(partial),
  );
  await rename(partial, path);
  return path;
}
