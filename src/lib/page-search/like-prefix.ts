// Motif LIKE « commence par » : les jokers de la saisie (`%`, `_`) et la
// barre oblique inverse, caractère d'échappement par défaut, sont échappés.
export function likePrefix(value: string): string {
  return `${value.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}
