import { describe, expect, it } from "vitest";
import { notebookRows } from "./notebook-rows";
import { type WriteChange, planChanges } from "./plan";
import { EXAMPLE_ID } from "./test-notebook";
import { verifiedExample } from "./test-plan";

function publish(): WriteChange {
  const [change] = planChanges(
    { name: "d.zip", notebooks: [verifiedExample()] },
    new Map(),
  ).changes;
  if (change.kind !== "publish") throw new Error("publication attendue");
  return change;
}

describe("notebookRows", () => {
  const change = publish();
  const rows = notebookRows(change, 7);

  it("ajoute la version, rattachée au dépôt", () => {
    expect(rows.version).toEqual({
      notebookId: EXAMPLE_ID,
      version: 1,
      deliveryId: 7,
      fingerprint: change.verified.fingerprint,
      schemaVersion: "Campus Condorcet",
      pageCount: 2,
    });
  });

  it("met le cahier en ligne avec ses métadonnées, sans trace de retrait ni colonnes de load.ts", () => {
    expect(rows.notebook).toEqual({
      status: "published",
      onlineVersion: 1,
      withdrawalReason: null,
      withdrawnAt: null,
      openedOn: null,
      scanKey: null,
      transcriptionKey: null,
      transcription: null,
      departmentName: "Ain",
      departmentCode: "01",
      municipalityName: "Exempleville",
      inseeCode: "01004",
      postalCode: "01500",
      typedTranscription: "automatic",
      handwrittenTranscription: "manual",
    });
  });

  it("écrit chaque page avec son image et son texte", () => {
    expect(rows.pages).toEqual([
      {
        notebookId: EXAMPLE_ID,
        number: 1,
        imageKey: `notebooks/${EXAMPLE_ID}/v1/1.jpg`,
        imageContentType: "image/jpeg",
        width: 2484,
        height: 3507,
        text: "Cahier de doléances\nPlus de trains le dimanche.",
      },
      {
        notebookId: EXAMPLE_ID,
        number: 3,
        imageKey: `notebooks/${EXAMPLE_ID}/v1/3.png`,
        imageContentType: "image/png",
        width: 2484,
        height: 3507,
        text: "",
      },
    ]);
  });

  it("écrit les lignes dans l'ordre de chaque page", () => {
    expect(
      rows.lines.map(({ page, position, kind, zone, text }) => [
        page,
        position,
        kind,
        zone,
        text,
      ]),
    ).toEqual([
      [1, 1, "typed", null, "Cahier de doléances"],
      [
        1,
        2,
        "handwritten",
        "Corps de la contribution",
        "Plus de trains le dimanche.",
      ],
    ]);
    expect(rows.lines[0].polygon).toEqual(
      change.verified.notebook.pages[0].lines[0].polygon,
    );
  });

  it("numérote les chunks dans tout le cahier, avec leur page", () => {
    expect(rows.chunks).toEqual([
      {
        notebookId: EXAMPLE_ID,
        position: 1,
        page: 1,
        content: "Cahier de doléances",
      },
      {
        notebookId: EXAMPLE_ID,
        position: 2,
        page: 1,
        content: "Plus de trains le dimanche.",
      },
    ]);
  });
});
