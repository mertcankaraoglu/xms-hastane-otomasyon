// Server-only: Medi AI agent (RAG + appointment tools).
import { createClient } from "@supabase/supabase-js";
import { generateEmbeddings, generateResponse, streamResponse, GatewayError } from "@lovable.dev/ai-gateway";
import type { Database } from "@/integrations/supabase/types";
import { generateSlots, dayBoundsUtc, istanbulYmd, type WorkingHours } from "@/lib/slots";

export function pubClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}
type SB = ReturnType<typeof pubClient>;

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await generateEmbeddings({ model: "google/gemini-embedding-2", input: texts, dimensions: 768 });
  return res.data.map((d) => d.embedding as number[]);
}

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[]) => ({
  type: "function" as const, name, description, strict: true,
  parameters: { type: "object", properties, required, additionalProperties: false },
});
const str = (description: string) => ({ type: "string", description });
const optStr = (description: string) => ({ type: ["string", "null"], description });

const TOOLS = [
  fn("search_knowledge", "Hastane bilgi bankasında arama yapar (adres, ulaşım, saatler, tarihçe, sigorta, ücret, ziyaret, hizmetler vb.). Hastane hakkındaki her soruda önce bunu kullan.", { query: str("Arama sorgusu") }, ["query"]),
  fn("list_departments", "Hastanedeki tüm bölümleri listeler.", {}, []),
  fn("list_doctors", "Doktorları listeler. department_id verilirse o bölümün doktorlarını döner.", { department_id: optStr("Bölüm id (uuid) veya null") }, ["department_id"]),
  fn("get_available_slots", "Bir doktorun belirli bir gündeki boş randevu saatlerini döner.", { doctor_id: str("Doktor id"), date: str("YYYY-MM-DD (İstanbul tarihi)") }, ["doctor_id", "date"]),
  fn("book_appointment", "Randevu oluşturur. SADECE kullanıcı tüm bilgileri özetledikten sonra açıkça onay verdiyse çağır.", {
    doctor_id: str("Doktor id"), starts_at: str("get_available_slots'tan gelen ISO saat"), full_name: str("Ad soyad"),
    tc_no: str("11 haneli TC kimlik no"), phone: str("Telefon"), email: optStr("E-posta veya null"), complaint: optStr("Şikayet veya null"),
  }, ["doctor_id", "starts_at", "full_name", "tc_no", "phone", "email", "complaint"]),
  fn("lookup_appointment", "Randevu kodu ve telefon ile randevu sorgular.", { code: str("Randevu kodu"), phone: str("Telefon") }, ["code", "phone"]),
];

async function runTool(sb: SB, name: string, a: any): Promise<unknown> {
  switch (name) {
    case "search_knowledge": {
      let rows: { title: string; content: string }[] = [];
      try {
        const [v] = await embed([String(a.query)]);
        const { data } = await sb.rpc("match_kb", { _embedding: JSON.stringify(v), _count: 5 });
        rows = (data ?? []) as any;
      } catch { /* fall back below */ }
      if (rows.length === 0) {
        const { data } = await sb.from("kb_articles").select("title, content").order("sort_order");
        rows = data ?? [];
      }
      return rows.map((r) => ({ title: r.title, content: r.content }));
    }
    case "list_departments": {
      const { data } = await sb.from("departments").select("id, name, short_description").order("sort_order");
      return data;
    }
    case "list_doctors": {
      let q = sb.from("doctors").select("id, full_name, title, specialty, department_id, departments(name)").eq("active", true);
      if (a.department_id) q = q.eq("department_id", a.department_id);
      const { data } = await q.order("full_name");
      return (data ?? []).map((d: any) => ({ id: d.id, name: `${d.title} ${d.full_name}`, specialty: d.specialty, department_id: d.department_id, department: d.departments?.name }));
    }
    case "get_available_slots": {
      const date = String(a.date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Tarih YYYY-MM-DD olmalı" };
      if (date < istanbulYmd(new Date())) return { error: "Geçmiş tarih seçilemez" };
      const [{ data: doc }, { data: closed }] = await Promise.all([
        sb.from("doctors").select("working_hours, slot_minutes, full_name").eq("id", a.doctor_id).maybeSingle(),
        sb.from("closed_days").select("reason").eq("day", date).maybeSingle(),
      ]);
      if (!doc) return { error: "Doktor bulunamadı" };
      if (closed) return { date, slots: [], note: `Hastane bu gün kapalı: ${closed.reason ?? "tatil"}` };
      const [from, to] = dayBoundsUtc(date);
      const { data: booked } = await sb.rpc("get_booked_slots", { _doctor_id: a.doctor_id, _from: from, _to: to });
      const taken = new Set((booked ?? []).map((t: string) => new Date(t).toISOString()));
      const now = Date.now();
      const slots = generateSlots(date, (doc.working_hours ?? {}) as WorkingHours, doc.slot_minutes ?? 20)
        .filter((s) => !taken.has(s) && new Date(s).getTime() > now)
        .map((iso) => ({ iso, time: new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(11, 16) }));
      return { date, slots, note: slots.length ? undefined : "Bu gün boş saat yok (çalışma günü olmayabilir)" };
    }
    case "book_appointment": {
      if (!/^\d{11}$/.test(String(a.tc_no))) return { error: "TC kimlik no 11 haneli olmalı" };
      const { data, error } = await sb.rpc("book_appointment", {
        _doctor_id: a.doctor_id, _starts_at: a.starts_at, _full_name: a.full_name, _tc_no: a.tc_no,
        _phone: a.phone, _email: a.email ?? "", _complaint: a.complaint ?? "",
      });
      if (error) return { error: error.message.includes("duplicate") ? "Bu saat az önce doldu, başka saat seçin" : error.message };
      return { success: true, code: data };
    }
    case "lookup_appointment": {
      const { data, error } = await sb.rpc("lookup_appointment", { _code: String(a.code).trim().toUpperCase(), _phone: a.phone });
      if (error) return { error: error.message };
      return data?.length ? data : { error: "Randevu bulunamadı" };
    }
  }
  return { error: "Bilinmeyen araç" };
}

function instructions() {
  const now = new Date(Date.now() + 3 * 3600_000);
  const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  return `Sen Medicare Hastanesi'nin (Kadıköy/İstanbul) sanal asistanı "Medi AI"sın; güler yüzlü bir hemşire karakterisin.
Bugün: ${now.toISOString().slice(0, 10)} ${days[now.getUTCDay()]}, saat ${now.toISOString().slice(11, 16)} (İstanbul).
Kurallar:
- Her zaman Türkçe, sıcak, kısa ve net yanıt ver. Markdown (kalın, liste) kullanabilirsin.
- Hastane hakkındaki soruları yalnızca search_knowledge sonuçlarına dayanarak cevapla; bilgi yoksa uydurma, çağrı merkezine (0216 000 00 00) yönlendir.
- Bölüm/doktor bilgisi için list_departments / list_doctors kullan; id'leri kullanıcıya gösterme.
- Şikayete göre uygun bölümü öner ama ASLA teşhis koyma veya ilaç önerme. Göğüs ağrısı, nefes darlığı, bilinç kaybı, felç belirtisi, ciddi kanama gibi acil durumlarda hemen 112'yi aramasını söyle.
- Randevu akışı: bölüm → doktor → tarih → get_available_slots ile boş saatleri göster → ad soyad, 11 haneli TC, telefon iste (e-posta ve şikayet isteğe bağlı) → tüm bilgileri özetle ve onay iste → onaydan sonra book_appointment çağır → randevu kodunu kalın göster ve saklamasını söyle.
- Boş saatleri en fazla 12 tane, virgülle ayrılmış saat olarak göster. Hafta sonu/kapalı gün ise başka gün öner.
- Randevu iptali için /randevu-sorgula sayfasına yönlendir.
- Hastane dışı konularda kibarca konuya geri dön.
- HER yanıtın en sonuna, ayrı bir satırda, kullanıcının tıklayıp göndereceği hazır yanıtları şu formatta ekle: [[öneri: seçenek 1 | seçenek 2 | seçenek 3]]
  - Kullanıcıdan seçim istediğin sorularda (bölüm, doktor, tarih, saat, evet/hayır onayı) seçeneklerin her birini öneri olarak ver (en fazla 8).
  - Diğer durumlarda konuşmayı ilerletecek 1–3 öneri ver; kullanıcının ağzından yazılmış kısa cümleler olsun (ör. şikayet "gözüm ağrıyor" ise "Göz randevusu almak istiyorum").
  - Öneriler kısa olsun (en fazla ~6 kelime), "|" karakteri içermesin. Ad, TC, telefon gibi kişisel bilgileri asla öneri olarak yazma.`;
}

export async function runAgent(
  history: { role: "user" | "assistant"; content: string }[],
  onDelta: (t: string) => void = () => {},
): Promise<string> {
  const sb = pubClient();
  const input: any[] = history.map((m) => ({ role: m.role, content: m.content }));
  let full = "";
  const emit = (t: string) => { full += t; onDelta(t); };
  try {
    for (let step = 0; step < 8; step++) {
      const stream = await streamResponse({ model: "openai/gpt-6-astra", instructions: instructions(), input, tools: TOOLS });
      let output: any[] = [];
      let stepText = "";
      for await (const ev of stream as AsyncIterable<any>) {
        if (ev?.type === "response.output_text.delta" && typeof ev.delta === "string") {
          if (!stepText && full) emit("\n\n");
          stepText += ev.delta; emit(ev.delta);
        } else if (ev?.type === "response.completed") {
          output = ev.response?.output ?? [];
        }
      }
      const calls = output.filter((o) => o.type === "function_call");
      if (calls.length === 0) {
        if (!full.trim()) emit("Üzgünüm, şu an yanıt veremedim.");
        return full.trim();
      }
      input.push(...output);
      for (const c of calls) {
        let args: Record<string, any> = {};
        try { args = JSON.parse(c.arguments || "{}"); } catch { /* empty */ }
        const out = await runTool(sb, c.name, args).catch((e) => ({ error: String(e?.message ?? e) }));
        input.push({ type: "function_call_output", call_id: c.call_id, output: JSON.stringify(out) });
      }
    }
    emit("İsteğinizi tamamlayamadım, lütfen tekrar dener misiniz?");
    return full.trim();
  } catch (e) {
    let msg = "Bir sorun oluştu, lütfen tekrar deneyin.";
    if (e instanceof GatewayError) {
      console.error("Medi AI gateway error", e.code, e.ids);
      if (e.httpStatus === 429) msg = "Şu an çok yoğunum, lütfen birkaç saniye sonra tekrar deneyin.";
      if (e.httpStatus === 402) msg = "Asistan geçici olarak hizmet dışı. Lütfen 0216 000 00 00'ı arayın.";
    } else console.error("Medi AI error", e);
    emit((full ? "\n\n" : "") + msg);
    return full.trim();
  }
}
