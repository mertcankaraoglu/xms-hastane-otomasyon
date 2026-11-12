import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { call, ok } from "../run";
export default defineTool({
  name: "get_available_slots", title: "Boş saatleri getir",
  description: "Bir doktorun belirli bir gündeki boş randevu saatlerini döner (Europe/Istanbul). Randevu için 'iso' değerini book_appointment'a starts_at olarak verin.",
  inputSchema: {
    doctor: z.string().min(1).max(120).describe("Doktor slug"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD, İstanbul tarihi"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ doctor, date }) => {
    const d = await call("GET", `doctors/${encodeURIComponent(doctor)}/slots`, { date });
    return ok(d.closed ? `Hastane kapalı: ${d.reason}` : `${d.slots.length} boş saat`, d);
  },
});
