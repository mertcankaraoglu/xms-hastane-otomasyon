import { z } from "zod";
import { bookingPhoneSchema } from "@/lib/phone";
import { generateSlots, istanbulYmd, dayBoundsUtc, type WorkingHours } from "@/lib/slots";
import { pubClient, adminClient } from "@/lib/medi-ai.server";
import { bookingError } from "@/lib/booking-errors";
export { pubClient };

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public headers: Record<string, string> = {}) { super(message); }
}

export function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { ...CORS, "Cache-Control": "no-store", ...extra } });
}
export function errorResponse(e: unknown) {
  if (e instanceof ApiError) return json({ error: { code: e.code, message: e.message } }, e.status, e.headers);
  console.error("public api error", e);
  return json({ error: { code: "internal", message: "Beklenmeyen bir hata oluştu" } }, 500);
}

export function maskName(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0] + "*".repeat(Math.max(w.length - 1, 2))).join(" ");
}

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-MM-DD olmalı");
export const BookSchema = z.object({
  doctor: z.string().min(1).max(120).describe("Doktor slug"),
  starts_at: z.string().datetime({ offset: true }).describe("ISO 8601, slots uç noktasından gelen iso değeri"),
  full_name: z.string().trim().min(3).max(120),
  tc_no: z.string().regex(/^\d{11}$/, "TC kimlik no 11 haneli olmalı"),
  phone: bookingPhoneSchema,
  email: z.string().trim().email().max(200).optional(),
  complaint: z.string().trim().max(1000).optional(),
});
export const CodePhoneSchema = z.object({
  code: z.string().trim().min(4).max(20),
  phone: bookingPhoneSchema,
});

function parse<T extends z.ZodTypeAny>(s: T, v: unknown): z.infer<T> {
  const r = s.safeParse(v);
  if (!r.success) throw new ApiError(400, "invalid_input", r.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "));
  return r.data;
}

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export const LIMITS = { read: 120, write: 10 } as const;

export async function rateLimit(sb: ReturnType<typeof pubClient>, request: Request, bucket: keyof typeof LIMITS) {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { data, error } = await (await adminClient()).rpc("api_hit", { _ip_hash: await sha256(ip), _bucket: bucket, _limit: LIMITS[bucket] });
  if (error) { console.error("rate limit check failed", error.message); return; }
  if (data === false) throw new ApiError(429, "rate_limited", "Çok fazla istek. Lütfen biraz sonra tekrar deneyin.", { "Retry-After": "60" });
}

const DEPT_COLS = "slug, name, icon, short_description, cover_url";
const DOC_LIST = "slug, full_name, title, specialty, photo_url, departments(slug, name)";
const DOC_FULL = "slug, full_name, title, specialty, bio, photo_url, working_hours, slot_minutes, education, experience, interests, languages, certifications, departments(slug, name)";

async function doctorBySlug(sb: ReturnType<typeof pubClient>, slug: string) {
  const { data } = await sb.from("doctors").select(`id, ${DOC_FULL}`).eq("slug", slug).eq("active", true).maybeSingle();
  if (!data) throw new ApiError(404, "doctor_not_found", "Doktor bulunamadı");
  return data;
}

export async function freeSlots(sb: ReturnType<typeof pubClient>, doc: { id: string; working_hours: unknown; slot_minutes: number | null }, date: string) {
  if (date < istanbulYmd(new Date())) throw new ApiError(422, "past_date", "Geçmiş tarih seçilemez");
  const { data: closed } = await sb.from("closed_days").select("reason").eq("day", date).maybeSingle();
  if (closed) return { closed: true, reason: closed.reason ?? "Tatil", slots: [] as { iso: string; time: string }[] };
  const [from, to] = dayBoundsUtc(date);
  const { data: booked } = await sb.rpc("get_booked_slots", { _doctor_id: doc.id, _from: from, _to: to });
  const taken = new Set((booked ?? []).map((t: string) => new Date(t).toISOString()));
  const now = Date.now();
  const slots = generateSlots(date, (doc.working_hours ?? {}) as WorkingHours, doc.slot_minutes ?? 20)
    .filter((s) => !taken.has(s) && new Date(s).getTime() > now)
    .map((iso) => ({ iso, time: new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(11, 16) }));
  return { closed: false, reason: null, slots };
}

async function body(request: Request) {
  return request.json().catch(() => { throw new ApiError(400, "invalid_json", "Geçerli bir JSON gövdesi gönderin"); });
}

export type Sb = ReturnType<typeof pubClient>;

/** Core dispatcher shared by the REST API and the MCP server. Throws ApiError. */
export async function apiCall(sb: Sb, method: "GET" | "POST", path: string, query: URLSearchParams = new URLSearchParams(), getBody: () => Promise<unknown> = async () => ({})): Promise<{ data: any; status?: number }> {
    const seg = path.split("/").filter(Boolean);
    const url = { searchParams: query };
    const body = () => getBody();

    if (method === "GET") {
      if (seg[0] === "departments" && seg.length === 1) {
        const { data } = await sb.from("departments").select(DEPT_COLS).order("sort_order");
        return { data: data ?? [] };
      }
      if (seg[0] === "departments" && seg.length === 2) {
        const { data: d } = await sb.from("departments").select(`id, ${DEPT_COLS}, description, long_description, services`).eq("slug", seg[1]!).maybeSingle();
        if (!d) throw new ApiError(404, "department_not_found", "Bölüm bulunamadı");
        const [faqs, docs] = await Promise.all([
          sb.from("department_faqs").select("question, answer").eq("department_id", d.id).order("sort_order"),
          sb.from("doctors").select("slug, full_name, title, specialty, photo_url").eq("department_id", d.id).eq("active", true).order("full_name"),
        ]);
        const { id: _id, ...dept } = d;
        return { data: { ...dept, faqs: faqs.data ?? [], doctors: docs.data ?? [] } };
      }
      if (seg[0] === "doctors" && seg.length === 1) {
        const dep = url.searchParams.get("department");
        const q = url.searchParams.get("q")?.trim().toLocaleLowerCase("tr").slice(0, 80);
        let query = sb.from("doctors").select(`${DOC_LIST}, department_id`).eq("active", true).order("full_name");
        if (dep) {
          const { data: d } = await sb.from("departments").select("id").eq("slug", dep).maybeSingle();
          if (!d) throw new ApiError(404, "department_not_found", "Bölüm bulunamadı");
          query = query.eq("department_id", d.id);
        }
        const { data } = await query;
        const rows = (data ?? []).map(({ department_id: _x, ...r }) => r)
          .filter((r: any) => !q || `${r.title} ${r.full_name} ${r.specialty ?? ""} ${r.departments?.name ?? ""}`.toLocaleLowerCase("tr").includes(q));
        return { data: rows };
      }
      if (seg[0] === "doctors" && seg.length === 2) {
        const { id: _id, slot_minutes: _s, ...doc } = await doctorBySlug(sb, seg[1]!);
        return { data: { ...doc, timezone: "Europe/Istanbul" } };
      }
      if (seg[0] === "doctors" && seg.length === 3 && seg[2] === "slots") {
        const date = parse(ymd, url.searchParams.get("date") ?? "");
        const doc = await doctorBySlug(sb, seg[1]!);
        const r = await freeSlots(sb, doc, date);
        return { data: { doctor: doc.slug, date, timezone: "Europe/Istanbul", ...r } };
      }
      if (seg[0] === "closed-days") {
        const from = parse(ymd, url.searchParams.get("from") ?? istanbulYmd(new Date()));
        const to = url.searchParams.get("to");
        let q = sb.from("closed_days").select("day, reason").gte("day", from).order("day").limit(366);
        if (to) q = q.lte("day", parse(ymd, to));
        const { data } = await q;
        return { data: data ?? [] };
      }
      if (seg[0] === "info") {
        const { data } = await (await adminClient()).rpc("kb_fallback", { _count: 30 });
        return { data: { name: "Medicare Hastanesi", timezone: "Europe/Istanbul", articles: (data ?? []).filter((a: any) => !String(a.title).startsWith("📄")).map((a: any) => ({ title: a.title, content: a.content })) } };
      }
    }

    if (method === "POST" && seg[0] === "appointments") {
      if (seg.length === 1) {
        const b = parse(BookSchema, await body());
        const doc = await doctorBySlug(sb, b.doctor);
        const iso = new Date(b.starts_at).toISOString();
        const r = await freeSlots(sb, doc, istanbulYmd(new Date(iso)));
        if (r.closed) throw new ApiError(422, "hospital_closed", `Hastane bu gün kapalı: ${r.reason}`);
        if (!r.slots.some((s) => s.iso === iso)) throw new ApiError(409, "slot_unavailable", "Bu saat müsait değil; slots uç noktasından boş bir saat seçin");
        const { data, error } = await sb.rpc("book_appointment", {
          _doctor_id: doc.id, _starts_at: iso, _full_name: b.full_name, _tc_no: b.tc_no, _phone: b.phone, _email: b.email ?? "", _complaint: b.complaint ?? "",
        });
        if (error) {
          const be = bookingError(error);
          throw new ApiError(be.status, be.code, be.message);
        }
        return { data: { code: data, starts_at: iso, doctor: doc.slug, status: "pending" }, status: 201 };
      }
      if (seg[1] === "lookup") {
        const b = parse(CodePhoneSchema, await body());
        const { data } = await sb.rpc("lookup_appointment", { _code: b.code.toUpperCase(), _phone: b.phone });
        if (!data?.length) throw new ApiError(404, "appointment_not_found", "Randevu bulunamadı");
        return { data: data.map((a) => ({ code: a.code, starts_at: a.starts_at, status: a.status, doctor_name: a.doctor_name, department_name: a.department_name, patient_name: maskName(a.patient_name ?? "") })) };
      }
      if (seg[1] === "cancel") {
        const b = parse(CodePhoneSchema, await body());
        const { data, error } = await sb.rpc("cancel_appointment_public", { _code: b.code.toUpperCase(), _phone: b.phone });
        if (error) throw new ApiError(422, "cancel_rejected", error.message);
        if (!data) throw new ApiError(404, "appointment_not_found", "İptal edilebilir randevu bulunamadı");
        return { data: { code: b.code.toUpperCase(), status: "cancelled" } };
      }
    }
    throw new ApiError(404, "not_found", "Uç nokta bulunamadı");
}

export async function handle(request: Request, path: string): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method === "POST" ? "POST" : "GET";
  if (method === "GET" && path === "openapi.json") { const { openapi } = await import("@/lib/public-api.openapi"); return json(openapi(url.origin)); }
  const t0 = Date.now();
  let reqBody: unknown = undefined;
  const log = async (status: number, result: unknown, err?: string) => {
    const ev = await import("@/lib/event-log.server");
    void ev.logEvent({ channel: "rest", tool: `${method} /${path}`, method, path: `/api/public/v1/${path}`, client: request.headers.get("user-agent"), ipHash: await ev.ipHash(request),
      params: { query: Object.fromEntries(url.searchParams), body: reqBody }, result, status: status < 400 ? "ok" : "error", error: err ?? null, httpStatus: status, durationMs: Date.now() - t0 });
  };
  try {
    const sb = pubClient();
    await rateLimit(sb, request, method === "POST" ? "write" : "read");
    const r = await apiCall(sb, method, path, url.searchParams, async () => (reqBody = await body(request)));
    await log(r.status ?? 200, r.data);
    return json({ data: r.data }, r.status ?? 200);
  } catch (e) {
    const res = errorResponse(e);
    await log(res.status, null, e instanceof ApiError ? `${e.code}: ${e.message}` : String((e as any)?.message ?? e));
    return res;
  }
}
