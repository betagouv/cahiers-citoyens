import { withPreposition } from "./municipalities";
import type { Notebook } from "./domain";

const LONG_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function header(notebook: Notebook): string[] {
  const { name, department } = notebook.municipality;
  return [
    "Cahier de doléances et de propositions",
    `Commune ${withPreposition("de", name)} (${department})`,
    `Ouvert le ${LONG_DATE.format(new Date(notebook.openedOn)).replace(/^1 /, "1er ")}`,
  ];
}

// Contrat lu par scripts/chunk.ts : l'en-tête est le premier bloc, chaque bloc suivant
// (séparé par une ligne vide) est une contribution, signature éventuelle en dernière ligne.
export function formatTranscription(notebook: Notebook): string {
  const blocks = [
    header(notebook).join("\n"),
    ...notebook.contributions.map(({ text, signature }) =>
      signature === null ? text : `${text}\n${signature}`,
    ),
  ];
  return `${blocks.join("\n\n")}\n`;
}
