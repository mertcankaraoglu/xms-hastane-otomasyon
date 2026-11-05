import { describe, it, expect } from "vitest";
import { generateSlots } from "./slots";

const hours = { "1": ["09:00", "10:00"] as [string, string] };

describe("generateSlots", () => {
  it("splits working hours into doctor's slot length (Istanbul time)", () => {
    // 2026-11-02 is a Monday
    const s = generateSlots("2026-11-02", hours, 20);
    expect(s).toEqual([
      "2026-11-02T06:00:00.000Z",
      "2026-11-02T06:20:00.000Z",
      "2026-11-02T06:40:00.000Z",
    ]);
  });
  it("returns no slots on non-working days", () => {
    expect(generateSlots("2026-11-08", hours, 20)).toEqual([]); // Sunday
  });
});
