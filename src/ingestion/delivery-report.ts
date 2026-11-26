import type { IngestError, IngestErrorCode } from "./errors";
import type { PlanCounts } from "./plan";

// Version du format du rapport, indépendante de `schema_version` des cahiers :
// elle change quand un champ du rapport change de sens ou disparaît.
export const DELIVERY_REPORT_SCHEMA_VERSION = 1;

export const REPORTS_PREFIX = "reports/";

// Erreurs propres au rapport, en plus de celles de la vérification.
export const REPORT_ERROR_CODES = [
  // Un ZIP porte le nom d'un dépôt déjà traité : il est refusé sans être lu.
  "duplicate-delivery-name",
  // Le traitement a échoué de notre côté, tentatives épuisées.
  "processing-failed",
] as const;

export type ReportErrorCode =
  IngestErrorCode | (typeof REPORT_ERROR_CODES)[number];

export interface ReportError extends Omit<IngestError, "code"> {
  code: ReportErrorCode;
}

export type ReportStatus = "applied" | "rejected" | "failed";

export interface DeliveryReport {
  schema_version: typeof DELIVERY_REPORT_SCHEMA_VERSION;
  delivery: string;
  received_at: string;
  finished_at: string;
  status: ReportStatus;
  notebooks: PlanCounts;
  errors: ReportError[];
}

// Dépôt arrivé à un statut final, tel que lu en base.
export interface FinishedDelivery {
  name: string;
  status: ReportStatus;
  receivedAt: Date;
  finishedAt: Date;
  counts: PlanCounts;
  errors: IngestError[];
}

const NO_NOTEBOOKS: PlanCounts = { published: 0, replaced: 0, unchanged: 0 };

// Le message brut de l'échec reste chez nous (alerte, base) : il peut citer
// un hôte ou une requête.
const PROCESSING_FAILED: ReportError = {
  code: "processing-failed",
  message:
    "Le traitement a échoué de notre côté après plusieurs tentatives. L'équipe de la plateforme est prévenue ; inutile de renvoyer le dépôt.",
};

function baseName(name: string): string {
  return name.endsWith(".zip") ? name.slice(0, -".zip".length) : name;
}

// `reports/delivery-2026-11-24-0930.json` pour `delivery-2026-11-24-0930.zip`.
export function reportKey(name: string): string {
  return `${REPORTS_PREFIX}${baseName(name)}.json`;
}

// Le refus d'un renvoi ne doit pas écraser le rapport du dépôt d'origine.
export function duplicateReportKey(name: string): string {
  return `${REPORTS_PREFIX}${baseName(name)}.duplicate.json`;
}

function reportErrors(delivery: FinishedDelivery): ReportError[] {
  switch (delivery.status) {
    case "applied":
      return [];
    case "rejected":
      return delivery.errors;
    case "failed":
      return [PROCESSING_FAILED];
  }
}

// Tiré de la seule ligne en base : réécrire le rapport donne le même fichier.
export function buildDeliveryReport(
  delivery: FinishedDelivery,
): DeliveryReport {
  return {
    schema_version: DELIVERY_REPORT_SCHEMA_VERSION,
    delivery: delivery.name,
    received_at: delivery.receivedAt.toISOString(),
    finished_at: delivery.finishedAt.toISOString(),
    status: delivery.status,
    notebooks: delivery.counts,
    errors: reportErrors(delivery),
  };
}

export function buildDuplicateReport(name: string, at: Date): DeliveryReport {
  const date = at.toISOString();
  return {
    schema_version: DELIVERY_REPORT_SCHEMA_VERSION,
    delivery: name,
    received_at: date,
    finished_at: date,
    status: "rejected",
    notebooks: NO_NOTEBOOKS,
    errors: [
      {
        file: name,
        code: "duplicate-delivery-name",
        message: `${name} a déjà été traité : ce renvoi est refusé sans être lu. Un nouveau dépôt prend un nouvel horodatage.`,
      },
    ],
  };
}

export function serializeReport(report: DeliveryReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
