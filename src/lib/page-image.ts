import { and, eq } from "drizzle-orm";
import { getDatabase } from "../db/client";
import { notebooks, pages } from "../db/schema";
import type { ImageContentType } from "../ingestion/notebook";

export interface PageImageTarget {
  page: number;
  version: number;
}

export interface PageImage {
  key: string;
  contentType: ImageContentType;
}

const POSITIVE_INTEGER = /^[1-9]\d{0,8}$/;

// `?v=<version>` d'une adresse d'image ou de lignes : un entier positif.
export function parseVersion(version: string | null): number | undefined {
  if (version === null || !POSITIVE_INTEGER.test(version)) return undefined;
  return Number(version);
}

// `/notebooks/<id>/pages/<page>?v=<version>` : numéro de page et version
// viennent de l'URL, et seuls des entiers positifs désignent une image.
export function parsePageImageTarget(
  page: string,
  version: string | null,
): PageImageTarget | undefined {
  const parsedVersion = parseVersion(version);
  if (!POSITIVE_INTEGER.test(page) || parsedVersion === undefined) {
    return undefined;
  }
  return { page: Number(page), version: parsedVersion };
}

// Clé de l'image dans le bucket, relue à chaque requête : un cahier retiré,
// ou une version qui n'est plus en ligne, ne sert plus rien.
export async function getPageImage(
  id: string,
  { page, version }: PageImageTarget,
): Promise<PageImage | undefined> {
  const [row] = await getDatabase()
    .select({ key: pages.imageKey, contentType: pages.imageContentType })
    .from(pages)
    .innerJoin(notebooks, eq(notebooks.id, pages.notebookId))
    .where(
      and(
        eq(pages.notebookId, id),
        eq(pages.number, page),
        eq(notebooks.status, "published"),
        eq(notebooks.onlineVersion, version),
      ),
    );
  return row;
}
