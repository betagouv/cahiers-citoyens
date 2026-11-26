import type { IngestError, IngestErrorCode } from "./errors";

export interface EntryHeader {
  name: string;
  // Attributs externes du répertoire central : le mode Unix est dans les 16 bits hauts.
  externalFileAttributes: number;
}

const FILE_TYPE_MASK = 0o170000;
const SYMLINK = 0o120000;
const DIRECTORY = 0o040000;

function isControl(char: string): boolean {
  const code = char.charCodeAt(0);
  return code < 0x20 || code === 0x7f;
}

// Les caractères de contrôle sont montrés en \xNN dans le rapport.
export function printableName(name: string): string {
  return [...name]
    .map((char) =>
      isControl(char)
        ? `\\x${char.charCodeAt(0).toString(16).padStart(2, "0")}`
        : char,
    )
    .join("");
}

function fileType(attributes: number): number {
  return (attributes >>> 16) & FILE_TYPE_MASK;
}

function nameProblem(name: string): string | null {
  if (name === "") return "le nom est vide";
  if ([...name].some(isControl))
    return "le nom contient un caractère de contrôle";
  if (name.includes("\\")) return "le nom contient une barre oblique inverse";
  if (name.startsWith("/") || /^[A-Za-z]:/.test(name)) {
    return "le chemin est absolu";
  }
  if (name.split("/").includes("..")) return "le chemin contient « .. »";
  return null;
}

function error(
  name: string,
  code: IngestErrorCode,
  reason: string,
): IngestError {
  const file = printableName(name);
  return { file, code, message: `Fichier ${file} refusé : ${reason}.` };
}

// Tout est à la racine du ZIP : ni dossier, ni chemin, ni lien symbolique.
export function checkEntryHeader({
  name,
  externalFileAttributes,
}: EntryHeader): IngestError | null {
  const problem = nameProblem(name);
  if (problem !== null) {
    return error(name, "invalid-entry-name", problem);
  }
  const type = fileType(externalFileAttributes);
  if (name.endsWith("/") || type === DIRECTORY) {
    return error(name, "nested-entry", "le ZIP ne doit contenir aucun dossier");
  }
  if (name.includes("/")) {
    return error(
      name,
      "nested-entry",
      "tous les fichiers doivent être à la racine du ZIP",
    );
  }
  if (type === SYMLINK) {
    return error(name, "symlink-entry", "c'est un lien symbolique");
  }
  return null;
}
