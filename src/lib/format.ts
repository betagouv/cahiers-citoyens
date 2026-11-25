const numberFormat = new Intl.NumberFormat("fr-FR");
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

// `isoDate` au format AAAA-MM-JJ, tel que Postgres renvoie une colonne `date`.
export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

// Coupe à la fin d'un mot, avant `maxLength` caractères.
export function excerpt(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  // Un caractère de plus : si c'est une espace, le dernier mot est entier.
  const cut = normalized.slice(0, maxLength + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut.slice(0, maxLength)).replace(/[\s.,;:]+$/, "")}…`;
}
