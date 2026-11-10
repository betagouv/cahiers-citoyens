// Données FICTIVES, à remplacer par les vraies données une fois collectées.
// Elles servent seulement à montrer la mise en page de l'accueil.

export type CodeRegion =
  | "ARA"
  | "BFC"
  | "BRE"
  | "CVL"
  | "20R"
  | "GES"
  | "HDF"
  | "IDF"
  | "NOR"
  | "NAQ"
  | "OCC"
  | "PDL"
  | "PAC"
  | "971"
  | "972"
  | "973"
  | "974"
  | "976";

export interface Region {
  code: CodeRegion;
  nom: string;
  communesParticipantes: number;
  temoignages: number;
  themePrincipal: string;
}

export const regions: Region[] = [
  {
    code: "ARA",
    nom: "Auvergne-Rhône-Alpes",
    communesParticipantes: 1842,
    temoignages: 21430,
    themePrincipal: "Pouvoir d'achat",
  },
  {
    code: "BFC",
    nom: "Bourgogne-Franche-Comté",
    communesParticipantes: 1215,
    temoignages: 9870,
    themePrincipal: "Services publics",
  },
  {
    code: "BRE",
    nom: "Bretagne",
    communesParticipantes: 734,
    temoignages: 11260,
    themePrincipal: "Transition écologique",
  },
  {
    code: "CVL",
    nom: "Centre-Val de Loire",
    communesParticipantes: 702,
    temoignages: 7140,
    themePrincipal: "Services publics",
  },
  {
    code: "20R",
    nom: "Corse",
    communesParticipantes: 98,
    temoignages: 1120,
    themePrincipal: "Pouvoir d'achat",
  },
  {
    code: "GES",
    nom: "Grand Est",
    communesParticipantes: 1630,
    temoignages: 15320,
    themePrincipal: "Fiscalité",
  },
  {
    code: "HDF",
    nom: "Hauts-de-France",
    communesParticipantes: 1480,
    temoignages: 16980,
    themePrincipal: "Pouvoir d'achat",
  },
  {
    code: "IDF",
    nom: "Île-de-France",
    communesParticipantes: 690,
    temoignages: 24510,
    themePrincipal: "Démocratie et citoyenneté",
  },
  {
    code: "NOR",
    nom: "Normandie",
    communesParticipantes: 1105,
    temoignages: 10240,
    themePrincipal: "Fiscalité",
  },
  {
    code: "NAQ",
    nom: "Nouvelle-Aquitaine",
    communesParticipantes: 1960,
    temoignages: 19870,
    themePrincipal: "Services publics",
  },
  {
    code: "OCC",
    nom: "Occitanie",
    communesParticipantes: 1890,
    temoignages: 20150,
    themePrincipal: "Pouvoir d'achat",
  },
  {
    code: "PDL",
    nom: "Pays de la Loire",
    communesParticipantes: 620,
    temoignages: 10830,
    themePrincipal: "Transition écologique",
  },
  {
    code: "PAC",
    nom: "Provence-Alpes-Côte d'Azur",
    communesParticipantes: 540,
    temoignages: 13690,
    themePrincipal: "Fiscalité",
  },
  {
    code: "971",
    nom: "Guadeloupe",
    communesParticipantes: 21,
    temoignages: 640,
    themePrincipal: "Pouvoir d'achat",
  },
  {
    code: "972",
    nom: "Martinique",
    communesParticipantes: 24,
    temoignages: 580,
    themePrincipal: "Pouvoir d'achat",
  },
  {
    code: "973",
    nom: "Guyane",
    communesParticipantes: 12,
    temoignages: 310,
    themePrincipal: "Services publics",
  },
  {
    code: "974",
    nom: "La Réunion",
    communesParticipantes: 22,
    temoignages: 1480,
    themePrincipal: "Pouvoir d'achat",
  },
  {
    code: "976",
    nom: "Mayotte",
    communesParticipantes: 9,
    temoignages: 190,
    themePrincipal: "Services publics",
  },
];

export const totalTemoignages = regions.reduce(
  (total, r) => total + r.temoignages,
  0,
);
export const totalCommunes = regions.reduce(
  (total, r) => total + r.communesParticipantes,
  0,
);

export const revendications = {
  themes: [
    "Pouvoir d'achat",
    "Fiscalité et justice fiscale",
    "Services publics de proximité",
    "Démocratie et référendum (RIC)",
    "Transition écologique",
    "Retraites et minima sociaux",
  ],
  mentions: [38420, 33150, 27610, 24980, 15230, 13740],
};

export const tailleCommunes = {
  tranches: [
    "Moins de 500 hab.",
    "500 à 2 000 hab.",
    "2 000 à 10 000 hab.",
    "Plus de 10 000 hab.",
  ],
  part: [41, 31, 19, 9],
};

export const depotsParSemaine = {
  semaines: [
    "10 déc.",
    "17 déc.",
    "24 déc.",
    "31 déc.",
    "7 janv.",
    "14 janv.",
    "21 janv.",
    "28 janv.",
    "4 févr.",
    "11 févr.",
    "18 févr.",
  ],
  temoignages: [
    3200, 9800, 7400, 6900, 15600, 24800, 29300, 27100, 22400, 18900, 11500,
  ],
};
