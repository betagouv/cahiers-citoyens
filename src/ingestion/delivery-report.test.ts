import { describe, expect, it } from "vitest";
import {
  type FinishedDelivery,
  buildDeliveryReport,
  buildDuplicateReport,
  duplicateReportKey,
  reportKey,
  serializeReport,
} from "./delivery-report";

const NAME = "delivery-2026-11-24-0930.zip";

function finished(overrides: Partial<FinishedDelivery>): FinishedDelivery {
  return {
    name: NAME,
    status: "applied",
    receivedAt: new Date("2026-11-24T09:31:12Z"),
    finishedAt: new Date("2026-11-24T09:35:00Z"),
    counts: { published: 12, replaced: 3, unchanged: 85 },
    errors: [],
    ...overrides,
  };
}

describe("reportKey et duplicateReportKey", () => {
  it("placent le rapport sous reports/, sans l'extension du ZIP", () => {
    expect(reportKey(NAME)).toBe("reports/delivery-2026-11-24-0930.json");
    expect(duplicateReportKey(NAME)).toBe(
      "reports/delivery-2026-11-24-0930.duplicate.json",
    );
    expect(reportKey("nom-sans-extension")).toBe(
      "reports/nom-sans-extension.json",
    );
  });
});

describe("buildDeliveryReport", () => {
  it("rapporte un dépôt publié avec ses compteurs", () => {
    expect(buildDeliveryReport(finished({}))).toEqual({
      schema_version: 1,
      delivery: NAME,
      received_at: "2026-11-24T09:31:12.000Z",
      finished_at: "2026-11-24T09:35:00.000Z",
      status: "applied",
      notebooks: { published: 12, replaced: 3, unchanged: 85 },
      errors: [],
    });
  });

  it("reprend les erreurs d'un dépôt refusé", () => {
    const error = {
      notebook: "C1",
      file: "C1.json",
      page: 2,
      position: 2,
      code: "duplicate-page" as const,
      message: "Page en double",
    };
    const counts = { published: 0, replaced: 0, unchanged: 0 };

    expect(
      buildDeliveryReport(
        finished({ status: "rejected", counts, errors: [error] }),
      ),
    ).toMatchObject({ status: "rejected", notebooks: counts, errors: [error] });
  });

  it("remplace l'échec brut par une erreur générique", () => {
    const report = buildDeliveryReport(
      finished({
        status: "failed",
        counts: { published: 0, replaced: 0, unchanged: 0 },
      }),
    );

    expect(report.errors).toEqual([
      expect.objectContaining({ code: "processing-failed" }),
    ]);
  });
});

describe("buildDuplicateReport", () => {
  it("refuse le renvoi avec un code explicite", () => {
    expect(
      buildDuplicateReport(NAME, new Date("2026-11-25T08:00:00Z")),
    ).toEqual({
      schema_version: 1,
      delivery: NAME,
      received_at: "2026-11-25T08:00:00.000Z",
      finished_at: "2026-11-25T08:00:00.000Z",
      status: "rejected",
      notebooks: { published: 0, replaced: 0, unchanged: 0 },
      errors: [
        {
          file: NAME,
          code: "duplicate-delivery-name",
          message: `${NAME} a déjà été traité : ce renvoi est refusé sans être lu. Un nouveau dépôt prend un nouvel horodatage.`,
        },
      ],
    });
  });
});

describe("serializeReport", () => {
  it("écrit un JSON indenté, terminé par un saut de ligne", () => {
    const report = buildDuplicateReport(NAME, new Date(0));

    expect(serializeReport(report)).toBe(
      `${JSON.stringify(report, null, 2)}\n`,
    );
  });
});
