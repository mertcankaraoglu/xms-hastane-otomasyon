import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { call, ok } from "../run";
export default defineTool({
  name: "search_doctors", title: "Doktor ara",
  description: "Doktorları bölüm slug'ı ve/veya ad, uzmanlık, bölüm adında geçen metinle arar. Parametresiz çağrı tüm doktorları döner.",
  inputSchema: {
    department: z.string().max(120).optional().describe("Bölüm slug filtresi"),
    query: z.string().max(80).optional().describe("Ad, uzmanlık veya bölüm adı metni"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ department, query }) => { const d = await call("GET", "doctors", { department, q: query }); return ok(`${d.length} doktor`, d); },
});
