import { describe, it, expect } from "vitest";
import { bookingError, MAX_ACTIVE_APPOINTMENTS } from "./booking-errors";

describe("bookingError", () => {
  it("maps tc_phone_mismatch hint to 409 with Turkish message", () => {
    const e = bookingError({ message: "x", hint: "tc_phone_mismatch" });
    expect(e.code).toBe("tc_phone_mismatch"); expect(e.status).toBe(409);
  });
  it("maps past_time and hospital_closed to 422", () => {
    expect(bookingError({ hint: "past_time" }).status).toBe(422);
    expect(bookingError({ hint: "hospital_closed" }).code).toBe("hospital_closed");
  });
  it("maps unique violation to slot_taken", () => {
    expect(bookingError({ code: "23505", message: "duplicate key" }).code).toBe("slot_taken");
  });
  it("unknown errors become booking_rejected", () => {
    expect(bookingError({ message: "boom" }).code).toBe("booking_rejected");
  });
  it("active appointment limit is 3", () => { expect(MAX_ACTIVE_APPOINTMENTS).toBe(3); });
});
