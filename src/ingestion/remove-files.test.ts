import { describe, expect, it, vi } from "vitest";
import type { ImageStorage } from "./image-storage";
import { removeFiles } from "./remove-files";

describe("removeFiles", () => {
  it("supprime chaque clé et journalise les échecs sans s'arrêter", async () => {
    const removed: string[] = [];
    const storage: ImageStorage = {
      put: () => Promise.resolve(),
      async remove(key) {
        if (key === "b") throw new Error("refusé");
        removed.push(key);
      },
    };
    const log = vi.fn();

    await expect(removeFiles(storage, ["a", "b", "c"], log)).resolves.toEqual([
      "b",
    ]);

    expect(removed).toEqual(["a", "c"]);
    expect(log).toHaveBeenCalledExactlyOnceWith(
      "Suppression de b impossible : refusé",
    );
  });
});
