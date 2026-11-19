// Machine-readable booking error codes raised by the book_appointment /
// panel_create_appointment RPCs (sent in the Postgres HINT field).
export const BOOKING_ERRORS = {
  invalid_phone: { status: 400, message: "Telefon numarası 0 ile başlayan 11 rakam olmalı" },
  invalid_input: { status: 400, message: "Eksik veya hatalı bilgi" },
  doctor_not_found: { status: 404, message: "Doktor bulunamadı" },
  doctor_inactive: { status: 422, message: "Bu doktor şu anda randevu kabul etmiyor" },
  past_time: { status: 422, message: "Geçmiş bir saat seçilemez" },
  hospital_closed: { status: 422, message: "Seçilen gün hastane kapalı" },
  outside_working_hours: { status: 422, message: "Doktor bu gün çalışmıyor" },
  invalid_slot: { status: 422, message: "Seçilen saat doktorun randevu saatlerine uygun değil" },
  slot_taken: { status: 409, message: "Bu saat dolu, lütfen başka bir saat seçin" },
  tc_phone_mismatch: { status: 409, message: "Bu TC kimlik numarası farklı bir telefonla kayıtlı. Lütfen kayıtlı telefonunuzu girin veya hastaneyi arayın." },
  too_many_active: { status: 409, message: "En fazla 3 ileri tarihli aktif randevunuz olabilir" },
  same_day_duplicate: { status: 409, message: "Aynı gün aynı doktordan zaten randevunuz var" },
} as const;
export type BookingErrorCode = keyof typeof BOOKING_ERRORS;
export const MAX_ACTIVE_APPOINTMENTS = 3;

/** Maps a Supabase RPC error to { code, status, message } with a Turkish message. */
export function bookingError(err: { message?: string; hint?: string | null; code?: string } | null | undefined) {
  const hint = (err?.hint ?? "") as string;
  if (hint in BOOKING_ERRORS) {
    const e = BOOKING_ERRORS[hint as BookingErrorCode];
    return { code: hint as BookingErrorCode, status: e.status, message: err?.message || e.message };
  }
  if (err?.code === "23505" || err?.message?.includes("duplicate")) return { code: "slot_taken" as const, ...BOOKING_ERRORS.slot_taken };
  return { code: "booking_rejected" as const, status: 422, message: err?.message || "Randevu oluşturulamadı" };
}
