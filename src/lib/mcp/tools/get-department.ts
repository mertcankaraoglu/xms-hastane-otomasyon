import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { call, ok } from "../run";
export default defineTool({
  name: "get_department", title: "Bölüm detayı",
  description: "Bir bölümün açıklaması, hizmetleri, sıkça sorulan soruları ve doktorlarını getirir.",
  inputSchema: { slug: z.string().min(1).max(120).describe("Bölüm slug, örn. kardiyoloji (list_departments'tan)") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => ok("Bölüm detayı", await call("GET", `departments/${encodeURIComponent(slug)}`)),
});
