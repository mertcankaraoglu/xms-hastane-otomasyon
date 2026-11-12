import { describe, expect, it } from "vitest";
import { bookingPhoneSchema, phoneInput } from "./phone";

describe("booking phone validation", () => {
  it("rejects missing digits", () => {
    expect(bookingPhoneSchema.safeParse("0532123456").success).toBe(false);
  });
  it("rejects excess digits", () => {
    expect(bookingPhoneSchema.safeParse("053212345678").success).toBe(false);
  });
  it("accepts 11 digit national mobile and landline numbers", () => {
    expect(bookingPhoneSchema.parse("05321234567")).toBe("05321234567");
    expect(bookingPhoneSchema.parse("02121234567")).toBe("02121234567");
  });
  it("requires the national prefix", () => {
    expect(bookingPhoneSchema.safeParse("15321234567").success).toBe(false);
  });
  it("limits input to 11 digits and removes non-digits", () => {
    expect(phoneInput("0532 123 45 6789abc")).toBe("05321234567");
  });
});