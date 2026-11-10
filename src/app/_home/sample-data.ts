// Données FICTIVES, à remplacer par les vraies données une fois collectées.
// Elles servent seulement à montrer la mise en page de l'accueil.

export type RegionCode =
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
  code: RegionCode;
  name: string;
  participatingMunicipalities: number;
  testimonies: number;
  mainTheme: string;
}

export const regions: Region[] = [
  {
    code: "ARA",
    name: "Auvergne-Rhône-Alpes",
    participatingMunicipalities: 1842,
    testimonies: 21430,
    mainTheme: "Pouvoir d'achat",
  },
  {
    code: "BFC",
    name: "Bourgogne-Franche-Comté",
    participatingMunicipalities: 1215,
    testimonies: 9870,
    mainTheme: "Services publics",
  },
  {
    code: "BRE",
    name: "Bretagne",
    participatingMunicipalities: 734,
    testimonies: 11260,
    mainTheme: "Transition écologique",
  },
  {
    code: "CVL",
    name: "Centre-Val de Loire",
    participatingMunicipalities: 702,
    testimonies: 7140,
    mainTheme: "Services publics",
  },
  {
    code: "20R",
    name: "Corse",
    participatingMunicipalities: 98,
    testimonies: 1120,
    mainTheme: "Pouvoir d'achat",
  },
  {
    code: "GES",
    name: "Grand Est",
    participatingMunicipalities: 1630,
    testimonies: 15320,
    mainTheme: "Fiscalité",
  },
  {
    code: "HDF",
    name: "Hauts-de-France",
    participatingMunicipalities: 1480,
    testimonies: 16980,
    mainTheme: "Pouvoir d'achat",
  },
  {
    code: "IDF",
    name: "Île-de-France",
    participatingMunicipalities: 690,
    testimonies: 24510,
    mainTheme: "Démocratie et citoyenneté",
  },
  {
    code: "NOR",
    name: "Normandie",
    participatingMunicipalities: 1105,
    testimonies: 10240,
    mainTheme: "Fiscalité",
  },
  {
    code: "NAQ",
    name: "Nouvelle-Aquitaine",
    participatingMunicipalities: 1960,
    testimonies: 19870,
    mainTheme: "Services publics",
  },
  {
    code: "OCC",
    name: "Occitanie",
    participatingMunicipalities: 1890,
    testimonies: 20150,
    mainTheme: "Pouvoir d'achat",
  },
  {
    code: "PDL",
    name: "Pays de la Loire",
    participatingMunicipalities: 620,
    testimonies: 10830,
    mainTheme: "Transition écologique",
  },
  {
    code: "PAC",
    name: "Provence-Alpes-Côte d'Azur",
    participatingMunicipalities: 540,
    testimonies: 13690,
    mainTheme: "Fiscalité",
  },
  {
    code: "971",
    name: "Guadeloupe",
    participatingMunicipalities: 21,
    testimonies: 640,
    mainTheme: "Pouvoir d'achat",
  },
  {
    code: "972",
    name: "Martinique",
    participatingMunicipalities: 24,
    testimonies: 580,
    mainTheme: "Pouvoir d'achat",
  },
  {
    code: "973",
    name: "Guyane",
    participatingMunicipalities: 12,
    testimonies: 310,
    mainTheme: "Services publics",
  },
  {
    code: "974",
    name: "La Réunion",
    participatingMunicipalities: 22,
    testimonies: 1480,
    mainTheme: "Pouvoir d'achat",
  },
  {
    code: "976",
    name: "Mayotte",
    participatingMunicipalities: 9,
    testimonies: 190,
    mainTheme: "Services publics",
  },
];

export const totalTestimonies = regions.reduce(
  (total, r) => total + r.testimonies,
  0,
);
export const totalMunicipalities = regions.reduce(
  (total, r) => total + r.participatingMunicipalities,
  0,
);

export const demands = {
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

export const municipalitySizes = {
  brackets: [
    "Moins de 500 hab.",
    "500 à 2 000 hab.",
    "2 000 à 10 000 hab.",
    "Plus de 10 000 hab.",
  ],
  share: [41, 31, 19, 9],
};

export const depositsPerWeek = {
  weeks: [
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
  testimonies: [
    3200, 9800, 7400, 6900, 15600, 24800, 29300, 27100, 22400, 18900, 11500,
  ],
};
