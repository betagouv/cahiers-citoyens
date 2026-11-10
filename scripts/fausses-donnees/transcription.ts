import { precede } from "./communes";
import type { Cahier } from "./domaine";

const DATE_LONGUE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function enTete(cahier: Cahier): string[] {
  const { nom, departement } = cahier.commune;
  return [
    "Cahier de doléances et de propositions",
    `Commune ${precede("de", nom)} (${departement})`,
    `Ouvert le ${DATE_LONGUE.format(new Date(cahier.dateOuverture)).replace(/^1 /, "1er ")}`,
  ];
}

// Contrat lu par scripts/decouper.ts : l'en-tête est le premier bloc, chaque bloc suivant
// (séparé par une ligne vide) est une contribution, signature éventuelle en dernière ligne.
export function formaterTranscription(cahier: Cahier): string {
  const blocs = [
    enTete(cahier).join("\n"),
    ...cahier.contributions.map(({ texte, signature }) =>
      signature === null ? texte : `${texte}\n${signature}`,
    ),
  ];
  return `${blocs.join("\n\n")}\n`;
}
