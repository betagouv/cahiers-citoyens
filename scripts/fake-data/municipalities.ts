import type { Municipality } from "./domain";

type Row = [
  name: string,
  inseeCode: string,
  department: string,
  region: string,
];

const ARA = "Auvergne-Rhône-Alpes";
const BFC = "Bourgogne-Franche-Comté";
const BRE = "Bretagne";
const CVL = "Centre-Val de Loire";
const GES = "Grand Est";
const HDF = "Hauts-de-France";
const IDF = "Île-de-France";
const NOR = "Normandie";
const NAQ = "Nouvelle-Aquitaine";
const OCC = "Occitanie";
const PDL = "Pays de la Loire";
const PAC = "Provence-Alpes-Côte d'Azur";
const COR = "Corse";

const ROWS: Row[] = [
  ["Paris", "75056", "Paris", IDF],
  ["Marseille", "13055", "Bouches-du-Rhône", PAC],
  ["Lyon", "69123", "Rhône", ARA],
  ["Toulouse", "31555", "Haute-Garonne", OCC],
  ["Nantes", "44109", "Loire-Atlantique", PDL],
  ["Strasbourg", "67482", "Bas-Rhin", GES],
  ["Bordeaux", "33063", "Gironde", NAQ],
  ["Lille", "59350", "Nord", HDF],
  ["Rennes", "35238", "Ille-et-Vilaine", BRE],
  ["Saint-Étienne", "42218", "Loire", ARA],
  ["Le Havre", "76351", "Seine-Maritime", NOR],
  ["Dijon", "21231", "Côte-d'Or", BFC],
  ["Clermont-Ferrand", "63113", "Puy-de-Dôme", ARA],
  ["Limoges", "87085", "Haute-Vienne", NAQ],
  ["Perpignan", "66136", "Pyrénées-Orientales", OCC],
  ["Metz", "57463", "Moselle", GES],
  ["Amiens", "80021", "Somme", HDF],
  ["Caen", "14118", "Calvados", NOR],
  ["Orléans", "45234", "Loiret", CVL],
  ["Saint-Denis", "93066", "Seine-Saint-Denis", IDF],
  ["Créteil", "94028", "Val-de-Marne", IDF],
  ["Ajaccio", "2A004", "Corse-du-Sud", COR],
  ["Bastia", "2B033", "Haute-Corse", COR],
  ["Avignon", "84007", "Vaucluse", PAC],
  ["Quimper", "29232", "Finistère", BRE],
  ["Charleville-Mézières", "08105", "Ardennes", GES],
  ["Guéret", "23096", "Creuse", NAQ],
  ["Mende", "48095", "Lozère", OCC],
  ["Aurillac", "15014", "Cantal", ARA],
  ["Gap", "05061", "Hautes-Alpes", PAC],
  ["Foix", "09122", "Ariège", OCC],
  ["Cahors", "46042", "Lot", OCC],
  ["Auch", "32013", "Gers", OCC],
  ["Nevers", "58194", "Nièvre", BFC],
  ["Chaumont", "52121", "Haute-Marne", GES],
  ["Bar-le-Duc", "55029", "Meuse", GES],
  ["Vesoul", "70550", "Haute-Saône", BFC],
  ["Saint-Lô", "50502", "Manche", NOR],
  ["Alençon", "61001", "Orne", NOR],
  ["Laon", "02408", "Aisne", HDF],
  ["Saint-Brieuc", "22278", "Côtes-d'Armor", BRE],
  ["Niort", "79191", "Deux-Sèvres", NAQ],
  ["Châteauroux", "36044", "Indre", CVL],
  ["Moulins", "03190", "Allier", ARA],
  ["Saint-Flour", "15187", "Cantal", ARA],
  ["Langres", "52269", "Haute-Marne", GES],
  ["Lodève", "34142", "Hérault", OCC],
  ["Barcelonnette", "04019", "Alpes-de-Haute-Provence", PAC],
  ["Aubusson", "23008", "Creuse", NAQ],
  ["Mauriac", "15120", "Cantal", ARA],
  ["Clamecy", "58079", "Nièvre", BFC],
  ["Die", "26113", "Drôme", ARA],
  ["Largentière", "07132", "Ardèche", ARA],
  ["Le Vigan", "30350", "Gard", OCC],
  ["Saint-Girons", "09261", "Ariège", OCC],
  ["Mirande", "32256", "Gers", OCC],
  ["Confolens", "16106", "Charente", NAQ],
  ["Nontron", "24311", "Dordogne", NAQ],
  ["Parthenay", "79202", "Deux-Sèvres", NAQ],
  ["Ploërmel", "56165", "Morbihan", BRE],
  ["Mortagne-au-Perche", "61293", "Orne", NOR],
  ["Vouziers", "08490", "Ardennes", GES],
  ["Commercy", "55122", "Meuse", GES],
  ["Louhans-Châteaurenaud", "71263", "Saône-et-Loire", BFC],
  ["Tonnerre", "89418", "Yonne", BFC],
  ["Le Blanc", "36018", "Indre", CVL],
  ["La Châtre", "36046", "Indre", CVL],
  ["Pithiviers", "45252", "Loiret", CVL],
  ["Montdidier", "80561", "Somme", HDF],
  ["Vervins", "02789", "Aisne", HDF],
  ["Saint-Claude", "39478", "Jura", BFC],
];

export const MUNICIPALITIES: readonly Municipality[] = ROWS.map(
  ([name, inseeCode, department, region]) => ({
    name,
    inseeCode,
    department,
    region,
  }),
);

const CONTRACTIONS: Record<string, Record<string, string>> = {
  de: { "Le ": "du ", "Les ": "des " },
  à: { "Le ": "au ", "Les ": "aux " },
};

export function withPreposition(preposition: "de" | "à", name: string): string {
  for (const [article, contraction] of Object.entries(
    CONTRACTIONS[preposition],
  )) {
    if (name.startsWith(article))
      return contraction + name.slice(article.length);
  }
  if (preposition === "de" && /^[AEIOUYÉÈÊÎÔH]/.test(name)) return `d'${name}`;
  return `${preposition} ${name}`;
}
