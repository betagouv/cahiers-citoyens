import { type OnlineDepartment, isOverseasDepartment } from "./departments";

function notebooks(count: number): string {
  return count === 1
    ? "1 cahier est consultable"
    : `${count} cahiers sont consultables`;
}

function metropolitan(count: number): string | undefined {
  if (count === 0) return undefined;
  return count === 1 ? "un département" : `${count} départements`;
}

// Où sont les cahiers en ligne : « 2 départements et les outre-mer ».
function places(departments: readonly OnlineDepartment[]): string {
  const overseas = departments.some((department) =>
    isOverseasDepartment(department.code),
  );
  const metropole = metropolitan(
    departments.filter((department) => !isOverseasDepartment(department.code))
      .length,
  );
  if (metropole === undefined) return "les outre-mer";
  return overseas ? `${metropole} et les outre-mer` : metropole;
}

// Le paragraphe « Ce qui est en ligne » de l'accueil, aussi sans cahier publié.
export function onlineSummary(
  departments: readonly OnlineDepartment[],
): string {
  if (departments.length === 0)
    return "Aucun cahier n'est encore consultable. Les cahiers sont mis en ligne progressivement, département par département.";
  const total = departments.reduce(
    (sum, department) => sum + department.notebookCount,
    0,
  );
  return `${notebooks(total)} aujourd'hui, dans ${places(departments)}. Sélectionnez un département pour lire ses cahiers.`;
}
