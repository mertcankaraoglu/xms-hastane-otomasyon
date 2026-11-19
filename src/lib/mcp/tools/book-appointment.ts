import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { call, ok } from "../run";
export default defineTool({
  name: "book_appointment", title: "Randevu oluştur",
  description: "Randevu oluşturur ve randevu kodunu döner. SADECE kullanıcı doktor, saat ve kişisel bilgilerin özetini gördükten sonra açıkça onay verdiyse çağırın. Olası hata kodları: past_time, hospital_closed, outside_working_hours, invalid_slot, doctor_inactive, slot_taken/slot_unavailable (başka saat seçin), tc_phone_mismatch (TC farklı telefonla kayıtlı; kayıtlı telefonu isteyin), too_many_active (en fazla 3 ileri tarihli aktif randevu), same_day_duplicate (aynı gün aynı doktora ikinci randevu yok).",
  inputSchema: {
    doctor: z.string().min(1).max(120).describe("Doktor slug"),
    starts_at: z.string().describe("get_available_slots'tan gelen iso değeri"),
    full_name: z.string().trim().min(3).max(120).describe("Hastanın adı soyadı"),
    tc_no: z.string().regex(/^\d{11}$/).describe("11 haneli TC kimlik no"),
    phone: z.string().regex(/^0[1-9][0-9]{9}$/).describe("0 ile başlayan 11 haneli telefon, örn. 05321234567"),
    email: z.string().email().max(200).optional().describe("İsteğe bağlı e-posta"),
    complaint: z.string().max(1000).optional().describe("İsteğe bağlı şikayet"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (a) => {
    const d = await call("POST", "appointments", {}, a);
    return ok(`Randevu oluşturuldu. Kod: ${d.code} — kullanıcıya saklamasını söyleyin.`, d);
  },
});
