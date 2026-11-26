import { describe, expect, it } from "vitest";
import { formatMebibytes, measure } from "./measure";

describe("measure", () => {
  it("mesure la durée et la mémoire pendant l'exécution", async () => {
    const measured = await measure(async () => {
      const kept = Buffer.alloc(64 * 1024 * 1024, 1);
      await new Promise((resolve) => setTimeout(resolve, 30));
      return kept.length;
    }, 5);
    expect(measured.value).toBe(64 * 1024 * 1024);
    expect(measured.seconds).toBeGreaterThan(0.02);
    expect(measured.peakRss).toBeGreaterThan(64 * 1024 * 1024);
  });

  it("arrête les relevés même si l'exécution échoue", async () => {
    await expect(
      measure(() => Promise.reject(new Error("échec"))),
    ).rejects.toThrow("échec");
  });
});

describe("formatMebibytes", () => {
  it("arrondit au Mo", () => {
    expect(formatMebibytes(3.6 * 1024 * 1024)).toBe("4 Mo");
  });
});
