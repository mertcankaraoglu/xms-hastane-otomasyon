import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { call, ok } from "../run";
export default defineTool({
  name: "manage_appointment", title: "Randevu sorgula / iptal et",
  description: "Randevu kodu ve telefonla randevuyu sorgular (action=lookup) veya iptal eder (action=cancel). İptal geri alınamaz; önce kullanıcıdan açık onay alın.",
  inputSchema: {
    action: z.enum(["lookup", "cancel"]).describe("lookup = sorgula, cancel = iptal et"),
    code: z.string().trim().min(4).max(20).describe("Randevu kodu"),
    phone: z.string().regex(/^0[1-9][0-9]{9}$/).describe("Randevudaki telefon"),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ action, code, phone }) => {
    const d = await call("POST", `appointments/${action}`, {}, { code, phone });
    return ok(action === "cancel" ? "Randevu iptal edildi" : "Randevu bilgileri (hasta adı maskeli)", d);
  },
});
