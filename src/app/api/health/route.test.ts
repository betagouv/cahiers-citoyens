import { expect, it } from "vitest";
import { GET } from "./route";

it("répond ok en JSON", async () => {
  const response = GET();

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/json");
  await expect(response.json()).resolves.toEqual({ status: "ok" });
});
