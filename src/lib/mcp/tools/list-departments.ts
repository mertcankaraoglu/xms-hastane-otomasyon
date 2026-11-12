import { defineTool } from "@lovable.dev/mcp-js";
import { call, ok } from "../run";
export default defineTool({
  name: "list_departments", title: "Bölümleri listele",
  description: "Medicare Hastanesi'nin tüm tıbbi bölümlerini (slug, ad, kısa açıklama) listeler.",
  inputSchema: {}, annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => { const d = await call("GET", "departments"); return ok(`${d.length} bölüm`, d); },
});
