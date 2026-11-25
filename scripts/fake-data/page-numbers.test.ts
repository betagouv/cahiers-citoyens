import { describe, expect, it } from "vitest";
import { pageNumbers } from "./page-numbers";
import { createRandom } from "./random";

describe("pageNumbers", () => {
  it("numérote de 1 à n sans trou par défaut", () => {
    expect(pageNumbers(4, null)).toEqual([1, 2, 3, 4]);
    expect(pageNumbers(0, null)).toEqual([]);
  });

  it("laisse des trous, toujours croissants, à partir de 1", () => {
    const numbers = pageNumbers(30, createRandom("trous"));
    expect(numbers[0]).toBe(1);
    expect(numbers).toHaveLength(30);
    expect(numbers[29]).toBeGreaterThan(30);
    numbers.slice(1).forEach((number, i) => {
      expect(number).toBeGreaterThan(numbers[i]);
    });
  });

  it("reste stable pour une même graine", () => {
    expect(pageNumbers(5, createRandom("a"))).toEqual(
      pageNumbers(5, createRandom("a")),
    );
  });
});
