const numberFormat = new Intl.NumberFormat("fr-FR");
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const percentFormat = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 0,
});
const monthFormat = new Intl.DateTimeFormat("fr-FR", {
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

export function formatMonth(isoDate: string): string {
  return monthFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

// « décembre 2018 – février 2019 », ou un seul mois si les deux coïncident.
export function formatMonthRange(
  firstIsoDate: string,
  lastIsoDate: string,
): string {
  const first = formatMonth(firstIsoDate);
  const last = formatMonth(lastIsoDate);
  return first === last ? first : `${first} – ${last}`;
}

// Arrondi à l'inférieur : 257 sur 258 donne 99 %, jamais un 100 % trompeur.
export function formatShare(part: number, total: number): string {
  if (total === 0) return percentFormat.format(0);
  return percentFormat.format(Math.floor((part / total) * 100) / 100);
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
