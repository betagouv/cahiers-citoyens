const numberFormat = new Intl.NumberFormat("fr-FR");
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
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
