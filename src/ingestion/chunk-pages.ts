import { splitContribution } from "./chunk-text";
import type { Line, Page } from "./notebook";

export interface PageChunk {
  page: number;
  content: string;
}

// Texte d'une page pour la lecture et la recherche plein texte : ses lignes
// dans l'ordre, une par ligne.
export function pageText(page: Page): string {
  return page.lines.map((line) => line.text).join("\n");
}

// Une contribution change quand l'écriture change (en-tête dactylographié,
// puis texte manuscrit), ou quand la page revient à une zone déjà vue depuis
// le début de la contribution : « Corps », « Signature », puis « Corps » ouvre
// la contribution suivante.
function opensContribution(current: readonly Line[], line: Line): boolean {
  const previous = current.at(-1);
  if (previous === undefined) return false;
  if (previous.kind !== line.kind) return true;
  return (
    previous.zone !== line.zone &&
    current.some(({ zone }) => zone === line.zone)
  );
}

function contributions(lines: readonly Line[]): Line[][] {
  const groups: Line[][] = [];
  let current: Line[] = [];
  for (const line of lines) {
    if (opensContribution(current, line)) {
      groups.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

function joinLines(lines: readonly Line[]): string {
  return lines
    .map(({ text }) => text.trim())
    .filter((text) => text !== "")
    .join(" ");
}

// Un chunk par contribution d'une page, coupé entre deux phrases au-delà de
// MAX_WORDS. Une contribution qui continue sur la page suivante y donne un
// autre chunk : la recherche cite ainsi toujours une seule page.
export function chunkPages(pages: readonly Page[]): PageChunk[] {
  return pages.flatMap((page) =>
    contributions(page.lines)
      .map(joinLines)
      .filter((content) => content !== "")
      .flatMap(splitContribution)
      .map((content) => ({ page: page.number, content })),
  );
}
