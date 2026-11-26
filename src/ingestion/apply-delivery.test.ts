import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createDatabase } from "../db/client";
import { applyDelivery } from "./apply-delivery";
import type { ImageStorage } from "./image-storage";
import { exampleDeliveryZip } from "./test-delivery";
import { EXAMPLE_ID } from "./test-notebook";
import { type TempDir, tempDir } from "./test-zip";
import { type VerifiedDelivery, verifyDelivery } from "./verify-delivery";

const fake = await vi.hoisted(async () => {
  const { createFakePostgres } = await import("../test/fake-postgres");
  return createFakePostgres();
});
vi.mock("postgres", () => ({ default: fake.connect }));

const db = createDatabase("postgres://test/app");
const OLD_KEYS = [
  `notebooks/${EXAMPLE_ID}/v1/1.jpg`,
  `notebooks/${EXAMPLE_ID}/v1/3.png`,
];

let dir: TempDir;
let zipPath: string;
let verified: VerifiedDelivery;

beforeAll(async () => {
  dir = await tempDir("apply-delivery-");
  zipPath = await dir.write(
    "delivery-2026-11-24-0930.zip",
    await exampleDeliveryZip(),
  );
  const result = await verifyDelivery(zipPath);
  if (!result.ok) throw new Error("dépôt de test invalide");
  verified = result.delivery;
});

afterAll(async () => {
  await dir.remove();
});

function memoryStorage() {
  const puts: string[] = [];
  const removes: string[] = [];
  const storage: ImageStorage = {
    async put({ key, body }) {
      for await (const chunk of body) void chunk;
      puts.push(key);
    },
    async remove(key) {
      removes.push(key);
    },
  };
  return { storage, puts, removes };
}

function statements(): string[] {
  return fake.queries.map(({ sql }) => sql.split(" ").slice(0, 3).join(" "));
}

// Cahier publié en version 1, d'une autre empreinte.
function publishedRows() {
  return [
    [[EXAMPLE_ID, "published", 1, "0".repeat(64), "1"]],
    OLD_KEYS.map((key) => [EXAMPLE_ID, key]),
  ];
}

beforeEach(() => {
  fake.reset();
});

describe("applyDelivery", () => {
  it("copie les images, écrit le cahier en une transaction puis recalcule les comptes", async () => {
    const { storage, puts, removes } = memoryStorage();
    fake.reply([["applying"]], [], [], [["applying"]], [], []);

    const result = await applyDelivery(
      { db, storage, log: vi.fn() },
      { id: 4, zipPath, verified },
    );

    expect(
      result.kind === "applied" && result.plan.changes.map(({ kind }) => kind),
    ).toEqual(["publish"]);
    expect(puts).toEqual([
      `notebooks/${EXAMPLE_ID}/v1/1.jpg`,
      `notebooks/${EXAMPLE_ID}/v1/3.png`,
    ]);
    expect(removes).toEqual([]);
    expect(statements()).toEqual([
      'select "status" from',
      'select "notebooks"."id", "notebooks"."status",',
      'select "notebook_id", "image_key"',
      "begin",
      'select "status" from',
      'select "notebooks"."id", "notebooks"."status",',
      'select "notebook_id", "image_key"',
      'insert into "notebooks"',
      'insert into "notebook_versions"',
      'update "notebooks" set',
      'delete from "chunks"',
      'delete from "pages"',
      'insert into "pages"',
      'insert into "lines"',
      'insert into "chunks"',
      'update "deliveries" set',
      "commit",
      "select refresh_search_counts()",
    ]);
    expect(fake.queries[4].sql).toMatch(/for update$/);
    expect(fake.queries[15].params).toEqual(["applied", 1, 0, 0, 4]);
  });

  it("supprime après le commit les images de la version remplacée", async () => {
    const { storage, puts, removes } = memoryStorage();
    fake.reply(
      [["applying"]],
      ...publishedRows(),
      [["applying"]],
      ...publishedRows(),
    );

    await applyDelivery(
      { db, storage, log: vi.fn() },
      { id: 4, zipPath, verified },
    );

    expect(puts).toEqual([
      `notebooks/${EXAMPLE_ID}/v2/1.jpg`,
      `notebooks/${EXAMPLE_ID}/v2/3.png`,
    ]);
    expect(removes).toEqual(OLD_KEYS);
    expect(
      fake.queries.find(({ sql }) => sql.startsWith('update "deliveries"'))
        ?.params,
    ).toEqual(["applied", 0, 1, 0, 4]);
  });

  it("n'écrit rien pour un cahier inchangé", async () => {
    const { storage, puts } = memoryStorage();
    const same = [
      [[EXAMPLE_ID, "published", 1, verified.notebooks[0].fingerprint, "1"]],
      [],
    ];
    fake.reply([["applying"]], ...same, [["applying"]], ...same);

    await applyDelivery(
      { db, storage, log: vi.fn() },
      { id: 4, zipPath, verified },
    );

    expect(puts).toEqual([]);
    expect(statements()).not.toContain('insert into "notebook_versions"');
    expect(fake.queries.at(-3)?.params).toEqual(["applied", 0, 0, 1, 4]);
  });

  it("ne refait pas un dépôt déjà appliqué, mais recalcule les comptes", async () => {
    const { storage, puts } = memoryStorage();
    fake.reply([["applied"]]);

    await expect(
      applyDelivery(
        { db, storage, log: vi.fn() },
        { id: 4, zipPath, verified },
      ),
    ).resolves.toEqual({
      kind: "already-applied",
    });

    expect(puts).toEqual([]);
    expect(statements()).toEqual([
      'select "status" from',
      "select refresh_search_counts()",
    ]);
  });

  it("refuse un dépôt qui n'est pas en cours d'application, avant toute copie", async () => {
    const { storage, puts } = memoryStorage();
    fake.reply([["verifying"]]);

    await expect(
      applyDelivery(
        { db, storage, log: vi.fn() },
        { id: 4, zipPath, verified },
      ),
    ).rejects.toThrow("Transition de dépôt interdite : verifying → applied");
    expect(puts).toEqual([]);
  });

  it("n'écrit rien si un cahier a changé depuis la planification", async () => {
    const { storage, removes } = memoryStorage();
    fake.reply([["applying"]], [], [], [["applying"]], ...publishedRows());

    await expect(
      applyDelivery(
        { db, storage, log: vi.fn() },
        { id: 4, zipPath, verified },
      ),
    ).rejects.toThrow(
      `Cahiers modifiés pendant l'application du dépôt : ${EXAMPLE_ID}.`,
    );
    expect(statements()).not.toContain("commit");
    expect(statements()).not.toContain('insert into "notebooks"');
    expect(removes).toEqual([]);
  });
});
