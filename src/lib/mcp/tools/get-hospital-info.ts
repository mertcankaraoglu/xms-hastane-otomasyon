import { defineTool } from "@lovable.dev/mcp-js";
import { call, ok } from "../run";
export default defineTool({
  name: "get_hospital_info", title: "Hastane bilgileri",
  description: "Adres, iletişim, çalışma saatleri, ulaşım, otopark, sigorta, ziyaret kuralları gibi genel bilgileri ve önümüzdeki kapalı günleri getirir.",
  inputSchema: {}, annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const [info, closed] = await Promise.all([call("GET", "info"), call("GET", "closed-days")]);
    return ok("Hastane bilgileri ve kapalı günler", { ...info, closed_days: closed });
  },
});
