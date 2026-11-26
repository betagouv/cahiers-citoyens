import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openLocalObject } from "./local-bucket";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "local-bucket-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("openLocalObject", () => {
  it("lit le fichier de la clé sous le dossier", async () => {
    await mkdir(join(root, "notebooks/CC_1/v1"), { recursive: true });
    await writeFile(join(root, "notebooks/CC_1/v1/1.jpg"), "jpeg");

    const object = await openLocalObject(root, "notebooks/CC_1/v1/1.jpg");

    expect(object?.contentLength).toBe(4);
    expect(object?.etag).toBeUndefined();
    expect(await new Response(object?.body).text()).toBe("jpeg");
  });

  it("renvoie undefined pour un fichier absent", async () => {
    await expect(
      openLocalObject(root, "notebooks/CC_1/v1/2.jpg"),
    ).resolves.toBeUndefined();
  });

  it("propage toute autre erreur de lecture", async () => {
    await mkdir(join(root, "dossier.jpg"));

    await expect(openLocalObject(root, "dossier.jpg")).rejects.toThrow();
  });
});
