import { describe, expect, it } from "vitest";
import { type NotebookState, isWrite, planChanges, planCounts } from "./plan";
import { verifiedExample } from "./test-plan";

const NOTEBOOK = verifiedExample();
const ID = NOTEBOOK.notebook.id;
const OTHER_FINGERPRINT = verifiedExample("Autreville").fingerprint;
const OLD_KEYS = [`notebooks/${ID}/v2/1.jpg`, `notebooks/${ID}/v2/3.jpg`];

function state(overrides: Partial<NotebookState>): NotebookState {
  return {
    status: "published",
    onlineVersion: 2,
    fingerprint: NOTEBOOK.fingerprint,
    latestVersion: 2,
    imageKeys: OLD_KEYS,
    ...overrides,
  };
}

function planFor(current: NotebookState | undefined) {
  const states = new Map<string, NotebookState>();
  if (current !== undefined) states.set(ID, current);
  states.set("absent-du-depot", state({}));
  const delivery = {
    name: "delivery-2026-11-24-0930.zip",
    notebooks: [NOTEBOOK],
  };
  const plan = planChanges(delivery, states);
  expect(plan.delivery).toBe(delivery);
  expect(plan.changes).toHaveLength(1);
  return plan.changes[0];
}

function uploads(version: number) {
  return [
    {
      page: 1,
      key: `notebooks/${ID}/v${version}/1.jpg`,
      entryName: `${ID}_1.png`,
      contentType: "image/jpeg",
      sha256: NOTEBOOK.images[0].sha256,
      bytes: 1001,
    },
    {
      page: 3,
      key: `notebooks/${ID}/v${version}/3.png`,
      entryName: `${ID}_3.png`,
      contentType: "image/png",
      sha256: NOTEBOOK.images[1].sha256,
      bytes: 1003,
    },
  ];
}

describe("planChanges", () => {
  it("publie en version 1 un cahier inconnu, sans rien retirer", () => {
    expect(planFor(undefined)).toEqual({
      kind: "publish",
      current: null,
      verified: NOTEBOOK,
      version: 1,
      uploads: uploads(1),
      removedKeys: [],
    });
  });

  it("ne change rien à un cahier publié de même empreinte", () => {
    const current = state({});
    expect(planFor(current)).toEqual({
      kind: "unchanged",
      verified: NOTEBOOK,
      current,
    });
  });

  it.each([
    ["d'empreinte différente", state({ fingerprint: OTHER_FINGERPRINT })],
    [
      "chargé par load.ts, sans version",
      state({
        onlineVersion: null,
        fingerprint: null,
        latestVersion: 0,
        imageKeys: [],
      }),
    ],
  ])("remplace un cahier publié %s", (_, current) => {
    const version = current.latestVersion + 1;
    expect(planFor(current)).toEqual({
      kind: "replace",
      current,
      verified: NOTEBOOK,
      version,
      uploads: uploads(version),
      removedKeys: current.imageKeys,
    });
  });

  it.each([
    ["de même empreinte", state({ status: "withdrawn" })],
    [
      "d'empreinte différente",
      state({ status: "withdrawn", fingerprint: OTHER_FINGERPRINT }),
    ],
    [
      "chargé par load.ts",
      state({
        status: "withdrawn",
        onlineVersion: null,
        fingerprint: null,
        latestVersion: 0,
        imageKeys: [],
      }),
    ],
  ])("republie un cahier retiré %s", (_, current) => {
    const version = current.latestVersion + 1;
    expect(planFor(current)).toEqual({
      kind: "republish",
      current,
      verified: NOTEBOOK,
      version,
      uploads: uploads(version),
      removedKeys: current.imageKeys,
    });
  });

  it("numérote après la plus grande version attribuée, même hors ligne", () => {
    const change = planFor(
      state({ status: "withdrawn", onlineVersion: 2, latestVersion: 5 }),
    );
    expect(isWrite(change) && change.version).toBe(6);
  });

  it("garde l'ordre du dépôt", () => {
    const other = verifiedExample("Autreville");
    const plan = planChanges(
      {
        name: "d.zip",
        notebooks: [
          NOTEBOOK,
          { ...other, notebook: { ...other.notebook, id: ID } },
        ],
      },
      new Map([[ID, state({})]]),
    );
    expect(plan.changes.map(({ kind }) => kind)).toEqual([
      "unchanged",
      "replace",
    ]);
  });
});

describe("planCounts", () => {
  it("compte une republication comme une publication", () => {
    const changes = [
      planFor(undefined),
      planFor(state({ status: "withdrawn" })),
      planFor(state({ fingerprint: OTHER_FINGERPRINT })),
      planFor(state({})),
      planFor(state({})),
    ];
    expect(
      planCounts({ delivery: { name: "d.zip", notebooks: [] }, changes }),
    ).toEqual({
      published: 2,
      replaced: 1,
      unchanged: 2,
    });
  });
});

describe("isWrite", () => {
  it("distingue un cahier inchangé des autres changements", () => {
    expect(isWrite(planFor(state({})))).toBe(false);
    expect(isWrite(planFor(undefined))).toBe(true);
  });
});
