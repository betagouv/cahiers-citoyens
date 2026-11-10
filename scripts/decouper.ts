export const MOTS_MIN = 100;
export const MOTS_MAX = 400;

function compterMots(texte: string): number {
  return texte.split(/\s+/).filter(Boolean).length;
}

function scinderParagraphe(paragraphe: string): string[] {
  if (compterMots(paragraphe) <= MOTS_MAX) return [paragraphe];
  const morceaux: string[] = [];
  let courant: string[] = [];
  let mots = 0;
  for (const phrase of paragraphe.split(/(?<=[.!?…])\s+/)) {
    const n = compterMots(phrase);
    if (courant.length > 0 && mots + n > MOTS_MAX) {
      morceaux.push(courant.join(" "));
      courant = [];
      mots = 0;
    }
    courant.push(phrase);
    mots += n;
  }
  if (courant.length > 0) morceaux.push(courant.join(" "));
  return morceaux;
}

function motsGroupe(groupe: string[]): number {
  return groupe.reduce((total, unite) => total + compterMots(unite), 0);
}

// Un dernier groupe trop court ne peut pas rejoindre le précédent sans dépasser
// MOTS_MAX (sinon le regroupement l'y aurait mis) : on déplace la coupure entre
// les deux plutôt que de les fusionner.
function reequilibrer(avantDernier: string[], dernier: string[]): string[][] {
  if (motsGroupe(dernier) >= MOTS_MIN) return [avantDernier, dernier];
  const unites = [...avantDernier, ...dernier];
  let meilleur = [avantDernier, dernier];
  for (let coupure = 1; coupure < unites.length; coupure++) {
    const gauche = unites.slice(0, coupure);
    const droite = unites.slice(coupure);
    if (motsGroupe(gauche) > MOTS_MAX || motsGroupe(droite) > MOTS_MAX)
      continue;
    if (
      Math.min(motsGroupe(gauche), motsGroupe(droite)) >
      Math.min(...meilleur.map(motsGroupe))
    ) {
      meilleur = [gauche, droite];
    }
  }
  return meilleur;
}

// Une contribution par paragraphe, en-tête exclu (voir fausses-donnees/transcription.ts).
export function decouper(transcription: string): string[] {
  const unites = transcription
    .split(/\n\s*\n/)
    .slice(1)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap(scinderParagraphe);

  const groupes: string[][] = [];
  let courant: string[] = [];
  let mots = 0;
  for (const unite of unites) {
    const n = compterMots(unite);
    if (courant.length > 0 && mots + n > MOTS_MAX) {
      groupes.push(courant);
      courant = [];
      mots = 0;
    }
    courant.push(unite);
    mots += n;
  }
  if (courant.length > 0) groupes.push(courant);

  const dernier = groupes.at(-1);
  const avantDernier = groupes.at(-2);
  if (dernier && avantDernier)
    groupes.splice(-2, 2, ...reequilibrer(avantDernier, dernier));
  return groupes.map((g) => g.join("\n\n"));
}
