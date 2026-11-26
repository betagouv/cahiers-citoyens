import { describe, expect, it } from "vitest";
import { createThrottle } from "./throttle";

describe("createThrottle", () => {
  it("laisse passer un départ par intervalle", () => {
    const throttle = createThrottle(30_000);

    expect(throttle.tryStart(1_000)).toBe(true);
    expect(throttle.tryStart(1_000)).toBe(false);
    expect(throttle.tryStart(30_999)).toBe(false);
    expect(throttle.tryStart(31_000)).toBe(true);
    expect(throttle.tryStart(40_000)).toBe(false);
  });
});
