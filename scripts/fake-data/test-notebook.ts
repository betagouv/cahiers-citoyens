import type { Notebook } from "./domain";

export function shortNotebook(): Notebook {
  return {
    id: "notebook-0001",
    municipality: {
      name: "Le Havre",
      inseeCode: "76351",
      department: "Seine-Maritime",
      region: "Normandie",
    },
    openedOn: "2019-01-01",
    contributions: [
      {
        position: 1,
        theme: "taxes",
        text: "Moins de taxes sur le carburant pour ceux qui roulent tous les jours.",
        signature: "M. A.",
      },
      {
        position: 2,
        theme: "health",
        text: "Un médecin au village.",
        signature: null,
      },
    ],
  };
}
