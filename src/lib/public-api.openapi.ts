// OpenAPI 3.1 description of /api/public/v1. Browser-safe: also rendered by /api-docs.
const err = { $ref: "#/components/responses/Error" };
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

export function openapi(origin: string) {
  const paths: Record<string, any> = {};
  for (const o of OPS) {
    paths[o.path] ??= {};
    paths[o.path][o.method] = {
      tags: [o.tag], summary: o.summary, description: o.description, parameters: o.parameters,
      requestBody: bodies[o.path] ? { required: true, content: { "application/json": { schema: bodies[o.path], example: o.example } } } : undefined,
      responses: { [o.path === "/appointments" ? "201" : "200"]: { description: "Başarılı; yanıt `{ data }` biçimindedir" }, "400": err, "404": err, "409": err, "422": err, "429": err },
    };
  }
  return {
    openapi: "3.1.0",
    info: { title: "Medicare Hastanesi Public API", version: "1.0.0", description: "Anahtarsız, herkese açık API. IP başına dakikada 120 okuma, 10 randevu işlemi. Tüm saatler Europe/Istanbul." },
    servers: [{ url: `${origin}/api/public/v1` }],
    paths,
    components: { responses: { Error: { description: "Hata", content: { "application/json": { schema: { type: "object", properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" } } } } } } } } } },
  };
}
