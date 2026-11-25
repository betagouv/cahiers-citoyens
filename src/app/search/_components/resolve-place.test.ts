import { expect, it, vi } from "vitest";
import { resolvePlace } from "@/lib/page-search/find-place";
import { resolvePlaceForRequest } from "./resolve-place";

vi.mock("@/lib/page-search/find-place", () => ({
  resolvePlace: vi.fn(() => Promise.resolve({ status: "none" })),
}));

it("délègue à resolvePlace", async () => {
  await expect(resolvePlaceForRequest("")).resolves.toEqual({ status: "none" });
  expect(resolvePlace).toHaveBeenCalledWith("");
});
