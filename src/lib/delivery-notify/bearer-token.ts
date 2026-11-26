import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

// `Authorization: Bearer <jeton>` porte le jeton attendu. Faux sans jeton
// attendu. La comparaison porte sur les empreintes, de même longueur, à temps
// constant : ni la durée ni une longueur différente ne renseignent sur le jeton.
export function hasBearerToken(
  authorization: string | null,
  expected: string | undefined,
): boolean {
  if (!expected || authorization === null) return false;
  const match = /^Bearer (.+)$/.exec(authorization);
  if (match === null) return false;
  return timingSafeEqual(digest(match[1]), digest(expected));
}
