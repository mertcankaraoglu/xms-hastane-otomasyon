// Server-only: records tool/endpoint calls from web chat, MCP and REST into integration_events
// via the log_integration_event SECURITY DEFINER RPC. Patient PII is masked before storage.
import { adminClient } from "./medi-ai.server";

export type Channel = "web_chat" | "mcp" | "rest";
const PII = new Set(["tc_no", "tc", "phone", "email", "full_name", "patient_name", "_tc_no", "_phone", "_email", "_full_name"]);

export function maskValue(key: string, v: unknown): unknown {
  if (typeof v !== "string" || !v) return v;
  if (key.includes("tc")) return v.length > 5 ? `${v.slice(0, 3)}${"*".repeat(v.length - 5)}${v.slice(-2)}` : "***";
  if (key.includes("phone")) return v.length > 6 ? `${v.slice(0, 4)}${"*".repeat(v.length - 6)}${v.slice(-2)}` : "***";
  if (key.includes("email")) { const [u, d] = v.split("@"); return `${(u ?? "").slice(0, 2)}***@${d ?? ""}`; }
  return v.split(/\s+/).map((w) => w ? `${w[0]}${"*".repeat(Math.max(1, w.length - 1))}` : w).join(" ");
}

/** Recursively masks patient PII keys. Doctor names are public, so `full_name` is only masked outside doctor objects. */
export function redact(v: unknown, depth = 0, parentKey = ""): unknown {
  if (depth > 6 || v == null) return v;
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => redact(x, depth + 1, parentKey));
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    const isDoctor = /doctor/.test(parentKey) || "specialty" in (v as object) || "title" in (v as object) && "slug" in (v as object);
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (k === "embedding") continue;
      if (PII.has(k) && !(isDoctor && (k === "full_name"))) out[k] = maskValue(k, x);
      else if (typeof x === "string" && x.length > 1500) out[k] = `${x.slice(0, 1500)}…`;
      else out[k] = redact(x, depth + 1, k);
    }
    return out;
  }
  return v;
}

export async function ipHash(req?: Request | null) {
  if (!req) return null;
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!ip) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export type LogInput = {
  channel: Channel; tool: string; conversationId?: string | null | undefined; sessionId?: string | null | undefined; client?: string | null | undefined;
  ipHash?: string | null | undefined; method?: string | undefined; path?: string | undefined; params?: unknown | undefined; result?: unknown | undefined;
  status?: "ok" | "error" | undefined; error?: string | null | undefined; httpStatus?: number | undefined; durationMs?: number | undefined; step?: number | undefined;
};

/** Never throws — logging must not break the user-facing call. */
export async function logEvent(e: LogInput) {
  try {
    const args = Object.fromEntries(Object.entries({
      _channel: e.channel, _tool: e.tool, _conversation_id: e.conversationId ?? undefined, _session_id: e.sessionId ?? undefined,
      _client: e.client ?? undefined, _ip_hash: e.ipHash ?? undefined, _method: e.method, _path: e.path,
      _params: (redact(e.params ?? null) ?? null) as any, _result: (redact(e.result ?? null) ?? null) as any,
      _status: e.status ?? "ok", _error: e.error ?? undefined, _http_status: e.httpStatus, _duration_ms: e.durationMs, _step: e.step,
    }).filter(([, v]) => v !== undefined && v !== null || false)) as any;
    args._params = (redact(e.params ?? null) ?? null) as any; args._result = (redact(e.result ?? null) ?? null) as any;
    const { error } = await (await adminClient()).rpc("log_integration_event", args);
    if (error) console.error("integration log failed", error.message);
  } catch (err) { console.error("integration log failed", err); }
}
