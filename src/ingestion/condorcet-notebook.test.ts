import { describe, expect, it } from "vitest";
import { toNotebook } from "./condorcet-notebook";
import { type NotebookId, parseNotebookId } from "./notebook-id";
import { EXAMPLE_ID, exampleNotebook } from "./test-notebook";

function exampleId(): NotebookId {
  const result = parseNotebookId(EXAMPLE_ID);
  if (!result.ok) throw new Error(result.error.message);
  return result.id;
}

describe("toNotebook", () => {
  it("traduit l'exemple du protocole en type du domaine", () => {
    expect(toNotebook(exampleId(), exampleNotebook())).toEqual({
      id: "CC_01500_190318_01004_MD_16116",
      schemaVersion: "Campus Condorcet",
      metadata: {
        department: "Ain",
        departmentCode: "01",
        municipality: "Exempleville",
        inseeCode: "01004",
        postalCode: "01500",
        typedTranscription: "automatic",
        handwrittenTranscription: "manual",
      },
      pages: [
        {
          number: 1,
          id: "CC_01500_190318_01004_MD_16116_1",
          width: 2484,
          height: 3507,
          lines: [
            {
              id: "CC_01500_190318_01004_MD_16116_1_1",
              kind: "typed",
              zone: null,
              text: "Cahier de doléances",
              polygon: [
                [
                  [239, 282],
                  [904, 282],
                  [904, 353],
                  [239, 353],
                  [239, 282],
                ],
              ],
            },
            {
              id: "CC_01500_190318_01004_MD_16116_1_2",
              kind: "handwritten",
              zone: "Corps de la contribution",
              text: "Plus de trains le dimanche.",
              polygon: [
                [
                  [251, 410],
                  [1630, 404],
                  [1632, 489],
                  [253, 495],
                  [251, 410],
                ],
              ],
            },
          ],
        },
        {
          number: 3,
          id: "CC_01500_190318_01004_MD_16116_3",
          width: 2484,
          height: 3507,
          lines: [],
        },
      ],
    });
  });

  it("traduit les deux modes de transcription", () => {
    const raw = exampleNotebook();
    raw.metadonnees.type_transcription_dactylographiee = "manuelle";
    raw.metadonnees.type_transcription_manuscrite = "automatique";
    expect(toNotebook(exampleId(), raw).metadata).toMatchObject({
      typedTranscription: "manual",
      handwrittenTranscription: "automatic",
    });
  });
});
