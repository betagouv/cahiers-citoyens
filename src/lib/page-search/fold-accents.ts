// Table de correspondance partagée avec la fonction SQL `fold_accents`
// (migration `0004_search-counts.sql`) : les deux côtés doivent replier un mot
// de la même façon, sinon une saisie ne retrouverait pas sa suggestion.
export const ACCENTED = "àâäáãåçéèêëíìîïñóòôöõúùûüýÿ";
export const UNACCENTED = "aaaaaaceeeeiiiinooooouuuuyy";

const FOLDED = new Map(
  [...ACCENTED].map((letter, index) => [letter, UNACCENTED[index]]),
);
const LIGATURES: Record<string, string> = { œ: "oe", æ: "ae" };

// Minuscules, sans accents ni ligatures : « Retraités » devient « retraites ».
// Sert à comparer un préfixe saisi aux mots des pages, sans tenir compte des
// accents ; le mot affiché garde les siens.
export function foldAccents(value: string): string {
  return [...value.toLowerCase()]
    .map((letter) => FOLDED.get(letter) ?? LIGATURES[letter] ?? letter)
    .join("");
}
