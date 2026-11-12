import { z } from "zod";

export const bookingPhoneSchema = z.string().trim().regex(/^0[1-9][0-9]{9}$/, "Telefon numarası 0 ile başlayan 11 rakam olmalı");

export function phoneInput(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, 11);
}