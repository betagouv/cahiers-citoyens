import type { Alert } from "./alert";
import type { ReportError } from "./delivery-report";

function codes(errors: readonly ReportError[]): string {
  return [...new Set(errors.map(({ code }) => code))].sort().join(", ");
}

export function rejectedAlert(
  delivery: string,
  errors: readonly ReportError[],
): Alert {
  return {
    event: "delivery.rejected",
    text: `Dépôt ${delivery} refusé : ${errors.length} erreur(s) (${codes(errors)}).`,
    details: { delivery, errors: errors.length, codes: codes(errors) },
  };
}

export function failedAlert(
  delivery: string,
  attempts: number,
  failure: string | null,
): Alert {
  const reason = failure ?? "cause inconnue";
  return {
    event: "delivery.failed",
    text: `Dépôt ${delivery} abandonné après ${attempts} tentatives : ${reason}`,
    details: { delivery, attempts, failure: reason },
  };
}
