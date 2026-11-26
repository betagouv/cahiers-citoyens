const numberFormat = new Intl.NumberFormat("fr-FR");

export function formatNumber(value: number): string {
  return numberFormat.format(value);
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
