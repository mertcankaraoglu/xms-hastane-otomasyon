import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { ok } from "../run";
export default defineTool({
  name: "search_knowledge", title: "Bilgi bankasında ara",
  description: "Hastane bilgi bankasında anlamsal (RAG) arama yapar ve en ilgili 5 maddeyi benzerlik skoruyla döner. Hastane hakkındaki serbest sorular için kullanın.",
  inputSchema: { query: z.string().trim().min(2).max(300).describe("Doğal dilde soru, örn. 'Otopark ücretli mi?'") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query }) => {
    const { pubClient, runTool } = await import("../../medi-ai.server");
    const rows = await runTool(pubClient(), "search_knowledge", { query });
    return ok("Bilgi bankası sonuçları (yalnızca bunlara dayanarak cevap verin)", rows);
  },
});
