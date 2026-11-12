// OpenAPI 3.1 description of /api/public/v1. Browser-safe: also rendered by /api-docs.
const slug = (name: string, d: string) => ({ name, in: "path", required: true, schema: { type: "string" }, description: d });
const phone = { type: "string", pattern: "^0[1-9][0-9]{9}$", example: "05321234567" };
const codePhone = { type: "object", required: ["code", "phone"], properties: { code: { type: "string", example: "MH-AB12CD" }, phone } };

export type Op = { method: "get" | "post"; path: string; summary: string; description?: string; tag: string; parameters?: any[]; example?: unknown };

export const OPS: Op[] = [
  { method: "get", path: "/departments", tag: "Bilgi", summary: "Bölüm listesi" },
  { method: "get", path: "/departments/{slug}", tag: "Bilgi", summary: "Bölüm detayı, hizmetler, SSS ve doktorlar", parameters: [slug("slug", "Bölüm slug, örn. kardiyoloji")] },
  { method: "get", path: "/doctors", tag: "Bilgi", summary: "Doktor listesi", parameters: [
    { name: "department", in: "query", schema: { type: "string" }, description: "Bölüm slug filtresi" },
    { name: "q", in: "query", schema: { type: "string" }, description: "Ad, uzmanlık veya bölüm adında arama" }] },
  { method: "get", path: "/doctors/{slug}", tag: "Bilgi", summary: "Doktor profili", parameters: [slug("slug", "Doktor slug")] },
  { method: "get", path: "/closed-days", tag: "Bilgi", summary: "Hastanenin kapalı olduğu günler", parameters: [
    { name: "from", in: "query", schema: { type: "string", format: "date" }, description: "Varsayılan bugün" },
    { name: "to", in: "query", schema: { type: "string", format: "date" } }] },
  { method: "get", path: "/info", tag: "Bilgi", summary: "Genel hastane bilgileri (adres, saatler, ulaşım, sigorta vb.)" },
  { method: "get", path: "/doctors/{slug}/slots", tag: "Randevu", summary: "Bir gündeki boş randevu saatleri", description: "Saatler Europe/Istanbul. `iso` değerini randevu oluştururken `starts_at` olarak gönderin.", parameters: [slug("slug", "Doktor slug"), { name: "date", in: "query", required: true, schema: { type: "string", format: "date" }, example: "2026-11-16" }] },
  { method: "post", path: "/appointments", tag: "Randevu", summary: "Randevu oluştur", description: "Başarılıysa 201 ve randevu kodu döner. 409: saat dolu, 422: kapalı gün/geçmiş tarih.",
    example: { doctor: "ayse-celik", starts_at: "2026-11-16T06:00:00.000Z", full_name: "Ali Yılmaz", tc_no: "12345678901", phone: "05321234567", email: "ali@example.com", complaint: "Kontrol" } },
  { method: "post", path: "/appointments/lookup", tag: "Randevu", summary: "Kod + telefon ile randevu sorgula", description: "Hasta adı maskeli döner, TC dönmez.", example: { code: "MH-AB12CD", phone: "05321234567" } },
  { method: "post", path: "/appointments/cancel", tag: "Randevu", summary: "Kod + telefon ile randevu iptal et", example: { code: "MH-AB12CD", phone: "05321234567" } },
];

const bodies: Record<string, unknown> = {
  "/appointments": { type: "object", required: ["doctor", "starts_at", "full_name", "tc_no", "phone"], properties: {
    doctor: { type: "string", description: "Doktor slug" }, starts_at: { type: "string", format: "date-time" },
    full_name: { type: "string", minLength: 3, maxLength: 120 }, tc_no: { type: "string", pattern: "^\\d{11}$" }, phone,
    email: { type: "string", format: "email" }, complaint: { type: "string", maxLength: 1000 } } },
  "/appointments/lookup": codePhone,
  "/appointments/cancel": codePhone,
};

const str = { type: "string" };
const ref = (n: string) => ({ $ref: `#/components/schemas/${n}` });
const list = (n: string) => ({ type: "array", items: ref(n) });
const schemas = {
  Department: { type: "object", properties: { slug: str, name: str, icon: str, short_description: str, cover_url: str }, example: { slug: "kardiyoloji", name: "Kardiyoloji", icon: "heart-pulse", short_description: "Kalp ve damar hastalıkları" } },
  DepartmentDetail: { allOf: [ref("Department"), { type: "object", properties: { description: str, long_description: str, services: { type: "array", items: str }, faqs: { type: "array", items: { type: "object", properties: { question: str, answer: str } } }, doctors: list("Doctor") } }] },
  Doctor: { type: "object", properties: { slug: str, full_name: str, title: str, specialty: str, photo_url: str, departments: { type: "object", properties: { slug: str, name: str } } }, example: { slug: "ahmet-yilmaz", full_name: "Ahmet Yılmaz", title: "Prof. Dr.", specialty: "Girişimsel Kardiyoloji" } },
  DoctorProfile: { allOf: [ref("Doctor"), { type: "object", properties: { bio: str, working_hours: { type: "object", additionalProperties: { type: "array", items: str }, example: { "1": ["09:00", "17:00"] } }, education: { type: "array", items: { type: "object" } }, experience: { type: "array", items: { type: "object" } }, interests: { type: "array", items: str }, languages: { type: "array", items: str }, certifications: { type: "array", items: str }, timezone: str } }] },
  ClosedDay: { type: "object", properties: { day: { type: "string", format: "date" }, reason: str } },
  Info: { type: "object", properties: { name: str, timezone: str, articles: { type: "array", items: { type: "object", properties: { title: str, content: str } } } } },
  Slots: { type: "object", properties: { doctor: str, date: { type: "string", format: "date" }, timezone: str, closed: { type: "boolean" }, reason: { type: ["string", "null"] }, slots: { type: "array", items: { type: "object", properties: { iso: { type: "string", format: "date-time" }, time: { type: "string", example: "09:00" } } } } } },
  Booked: { type: "object", properties: { code: { type: "string", example: "5A6ED8B3" }, starts_at: { type: "string", format: "date-time" }, doctor: str, status: { type: "string", example: "pending" } } },
  Lookup: { type: "object", properties: { code: str, starts_at: { type: "string", format: "date-time" }, status: { type: "string", enum: ["pending", "confirmed", "completed", "cancelled", "no_show"] }, doctor_name: str, department_name: str, patient_name: { type: "string", example: "A** Y*****" } } },
  Cancelled: { type: "object", properties: { code: str, status: { type: "string", example: "cancelled" } } },
  Error: { type: "object", properties: { error: { type: "object", properties: { code: { type: "string", enum: ["invalid_input", "invalid_json", "not_found", "department_not_found", "doctor_not_found", "appointment_not_found", "past_date", "hospital_closed", "slot_unavailable", "slot_taken", "booking_rejected", "cancel_rejected", "rate_limited", "internal"] }, message: str } } }, example: { error: { code: "slot_taken", message: "Bu saat az önce doldu, başka saat seçin" } } },
};
const RESP: Record<string, unknown> = {
  "get /departments": list("Department"), "get /departments/{slug}": ref("DepartmentDetail"),
  "get /doctors": list("Doctor"), "get /doctors/{slug}": ref("DoctorProfile"),
  "get /closed-days": list("ClosedDay"), "get /info": ref("Info"), "get /doctors/{slug}/slots": ref("Slots"),
  "post /appointments": ref("Booked"), "post /appointments/lookup": list("Lookup"), "post /appointments/cancel": ref("Cancelled"),
};
const e = (d: string) => ({ description: d, content: { "application/json": { schema: ref("Error") } } });

export function openapi(origin: string) {
  const paths: Record<string, any> = {};
  for (const o of OPS) {
    paths[o.path] ??= {};
    paths[o.path][o.method] = {
      tags: [o.tag], summary: o.summary, description: o.description, parameters: o.parameters,
      requestBody: bodies[o.path] ? { required: true, content: { "application/json": { schema: bodies[o.path], example: o.example } } } : undefined,
      responses: {
        [o.path === "/appointments" ? "201" : "200"]: { description: "Başarılı", content: { "application/json": { schema: { type: "object", properties: { data: RESP[`${o.method} ${o.path}`] } } } } },
        "400": e("Geçersiz girdi (invalid_input / invalid_json)"), "404": e("Kayıt bulunamadı"),
        ...(o.method === "post" || o.path.endsWith("slots") ? { "409": e("Saat dolu (slot_taken / slot_unavailable)"), "422": e("Kapalı gün, geçmiş tarih veya reddedilen işlem") } : {}),
        "429": { description: "İstek sınırı aşıldı (rate_limited)", headers: { "Retry-After": { schema: { type: "integer" }, description: "Saniye" } }, content: { "application/json": { schema: ref("Error") } } },
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: { title: "Medicare Hastanesi Public API", version: "1.0.0", description: "Anahtarsız, herkese açık API. IP başına dakikada 120 okuma, 10 randevu işlemi. Tüm saatler Europe/Istanbul." },
    servers: [{ url: `${origin}/api/public/v1` }],
    paths,
    tags: [{ name: "Bilgi", description: "Bölüm, doktor ve hastane bilgileri" }, { name: "Randevu", description: "Boş saat, randevu alma, sorgulama ve iptal" }],
    components: { schemas },
  };
}
