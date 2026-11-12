import { ToolError } from "@lovable.dev/mcp-js";

/** Runs a public-API call for an MCP tool, applying the per-IP rate limit when a request is available. */
export async function call(method: "GET" | "POST", path: string, query: Record<string, string | undefined> = {}, body?: unknown, bucket: "read" | "write" = method === "POST" ? "write" : "read") {
  const api = await import("../public-api.server");
  const sb = api.pubClient();
  try {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest();
      if (req) await api.rateLimit(sb, req, bucket);
    } catch (e) { if (e instanceof api.ApiError) throw e; }
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v) as [string, string][]);
    const r = await api.apiCall(sb, method, path, qs, async () => body ?? {});
    return r.data;
  } catch (e) {
    if (e instanceof api.ApiError) throw new ToolError(`${e.code}: ${e.message}`);
    throw e;
  }
}

export function ok(summary: string, data: unknown) {
  return { content: [{ type: "text" as const, text: `${summary}\n\n${JSON.stringify(data, null, 2)}` }] };
}
