import { describe, expect, it } from "vitest";
import { type NotebookState, planChanges } from "./plan";
import { assertPlanCurrent } from "./stale-plan";
import { EXAMPLE_ID } from "./test-notebook";
import { verifiedExample } from "./test-plan";

const NOTEBOOK = verifiedExample();
const PUBLISHED: NotebookState = {
  status: "published",
  onlineVersion: 1,
  fingerprint: "0".repeat(64),
  latestVersion: 1,
  imageKeys: [],
};

function plan(current: NotebookState | undefined) {
  return planChanges(
    { name: "d.zip", notebooks: [NOTEBOOK] },
    current === undefined ? new Map() : new Map([[EXAMPLE_ID, current]]),
  );
}

describe("assertPlanCurrent", () => {
  it("accepte un état inchangé, images comprises", () => {
    expect(() => assertPlanCurrent(plan(undefined), new Map())).not.toThrow();
    expect(() =>
      assertPlanCurrent(
        plan(PUBLISHED),
        new Map([[EXAMPLE_ID, { ...PUBLISHED, imageKeys: ["x"] }]]),
      ),
    ).not.toThrow();
  });

  it.each<[string, NotebookState | undefined, NotebookState | undefined]>([
    ["créé entre-temps", undefined, PUBLISHED],
    ["supprimé entre-temps", PUBLISHED, undefined],
    ["retiré", PUBLISHED, { ...PUBLISHED, status: "withdrawn" }],
    [
      "remis en ligne dans une autre version",
      PUBLISHED,
      { ...PUBLISHED, onlineVersion: 2 },
    ],
    [
      "d'une autre empreinte",
      PUBLISHED,
      { ...PUBLISHED, fingerprint: "1".repeat(64) },
    ],
    ["avec une version de plus", PUBLISHED, { ...PUBLISHED, latestVersion: 2 }],
  ])("refuse un cahier %s", (_, planned, locked) => {
    expect(() =>
      assertPlanCurrent(
        plan(planned),
        locked === undefined ? new Map() : new Map([[EXAMPLE_ID, locked]]),
      ),
    ).toThrow(
      `Cahiers modifiés pendant l'application du dépôt : ${EXAMPLE_ID}.`,
    );
  });
});
