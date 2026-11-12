import { describe, it, expect } from "vitest";
import { BookSchema, CodePhoneSchema, maskName, LIMITS } from "./public-api.server";

const ok = { doctor: "ayse-celik", starts_at: "2026-11-16T06:00:00.000Z", full_name: "Ali Yılmaz", tc_no: "12345678901", phone: "05321234567" };

describe("public api rules", () => {
  it("accepts a valid booking", () => expect(BookSchema.safeParse(ok).success).toBe(true));
  it("rejects 12-digit phone", () => expect(BookSchema.safeParse({ ...ok, phone: "053212345678" }).success).toBe(false));
  it("rejects 10-digit TC", () => expect(BookSchema.safeParse({ ...ok, tc_no: "1234567890" }).success).toBe(false));
  it("lookup requires a valid phone", () => expect(CodePhoneSchema.safeParse({ code: "MH-AB12CD", phone: "5321234567" }).success).toBe(false));
  it("masks patient name", () => expect(maskName("Ali Yılmaz")).toBe("A** Y*****"));
  it("limits: 120 reads, 10 writes per minute", () => expect(LIMITS).toEqual({ read: 120, write: 10 }));
});
