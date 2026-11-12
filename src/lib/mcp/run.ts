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

/** Wraps an MCP tool so every call is recorded in the staff panel's integration log (PII masked). */
export function withLog<T extends { name: string; handler: (args: any, ctx: any) => any }>(tool: T): T {
  const inner = tool.handler;
  return {
    ...tool,
    handler: async (args: any, ctx: any) => {
      const t0 = Date.now();
      let req: Request | null = null;
      try { const { getRequest } = await import("@tanstack/react-start/server"); req = getRequest() ?? null; } catch { /* no request */ }
      const info = ctx?.client?.info;
      const client = info ? `${info.title ?? info.name} ${info.version}` : req?.headers.get("user-agent") ?? null;
      const ev = await import("../event-log.server");
      const base = { channel: "mcp" as const, tool: tool.name, sessionId: req?.headers.get("mcp-session-id") ?? null, client, ipHash: await ev.ipHash(req), method: "tools/call", path: "/mcp", params: args };
      try {
        const res = await inner(args, ctx);
        const text = res?.content?.find?.((c: any) => c.type === "text")?.text as string | undefined;
        let data: unknown = text;
        const i = text?.indexOf("\n\n") ?? -1;
        if (text && i > 0) { try { data = { summary: text.slice(0, i), data: JSON.parse(text.slice(i + 2)) }; } catch { /* keep text */ } }
        await ev.logEvent({ ...base, result: data, durationMs: Date.now() - t0 });
        return res;
      } catch (e: any) {
        await ev.logEvent({ ...base, status: "error", error: String(e?.message ?? e), durationMs: Date.now() - t0 });
        throw e;
      }
    },
  } as T;
}
