import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { call, ok } from "../run";
export default defineTool({
  name: "get_doctor_profile", title: "Doktor profili",
  description: "Doktorun yayınlanmış tam profilini getirir: özgeçmiş, eğitim, kariyer, ilgi alanları, diller, sertifikalar, çalışma saatleri (İstanbul).",
  inputSchema: { slug: z.string().min(1).max(120).describe("Doktor slug (search_doctors'tan)") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => ok("Doktor profili", await call("GET", `doctors/${encodeURIComponent(slug)}`)),
});
