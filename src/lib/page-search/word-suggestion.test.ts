import { expect, it } from "vitest";
import { pageCountLabel } from "./word-suggestion";

it("accorde et formate le nombre de pages", () => {
  expect(pageCountLabel(1)).toBe("1 page");
  expect(pageCountLabel(7)).toBe("7 pages");
  expect(pageCountLabel(1312)).toBe("1 312 pages");
});
