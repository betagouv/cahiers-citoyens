import { asc, count, eq } from "drizzle-orm";
import { cacheLife } from "next/cache";
import { getDatabase } from "../db/client";
import { departments, notebooks } from "../db/schema";
import type { OnlineDepartment } from "./departments";

// Les départements qui ont au moins un cahier publié, avec leur nom du
// référentiel et leur nombre de cahiers. Les dépôts arrivent par un job dans
// un autre processus, qui ne peut pas invalider ce cache : le profil
// `minutes` le recalcule en arrière-plan au plus une fois par minute.
export async function listOnlineDepartments(): Promise<OnlineDepartment[]> {
  "use cache";
  cacheLife("minutes");
  return getDatabase()
    .select({
      code: departments.code,
      name: departments.name,
      notebookCount: count(notebooks.id),
    })
    .from(notebooks)
    .innerJoin(departments, eq(departments.code, notebooks.departmentCode))
    .where(eq(notebooks.status, "published"))
    .groupBy(departments.code, departments.name)
    .orderBy(asc(departments.code));
}
