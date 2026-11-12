import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type IntegrationEvent = {
  id: string; created_at: string; channel: string; conversation_id: string | null; session_id: string | null; client: string | null;
  ip_hash: string | null; tool: string; method: string | null; path: string | null; params: unknown; result: unknown;
  status: string; error: string | null; http_status: number | null; duration_ms: number | null; step: number | null;
};

export const CHANNEL_LABEL: Record<string, string> = { web_chat: "Web sohbet (Medi AI)", mcp: "MCP (Claude/ChatGPT)", rest: "REST API" };
const fmt = (s: string) => new Date(s).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "medium" });

export function useIntegrationEvents(filter: { channel?: string | undefined; conversationId?: string | null | undefined }) {
  return useQuery({
    queryKey: ["integration-events", filter.channel ?? "all", filter.conversationId ?? null],
    enabled: filter.conversationId !== null,
    queryFn: async () => {
      let q = supabase.from("integration_events").select("*").order("created_at", { ascending: !!filter.conversationId }).limit(500);
      if (filter.channel) q = q.eq("channel", filter.channel);
      if (filter.conversationId) q = q.eq("conversation_id", filter.conversationId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as IntegrationEvent[];
    },
  });
}

function Json({ v }: { v: unknown }) {
  if (v == null) return <p className="text-xs text-muted-foreground">—</p>;
  return <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-[11px] leading-relaxed">{JSON.stringify(v, null, 2)}</pre>;
}

function ParamList({ v }: { v: unknown }) {
  if (!v || typeof v !== "object") return null;
  const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined);
  if (!entries.length) return <p className="text-xs text-muted-foreground">Parametre yok</p>;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {entries.map(([k, x]) => <Fragment key={k}><dt className="font-mono text-muted-foreground">{k}</dt><dd className="break-all font-mono">{typeof x === "object" ? JSON.stringify(x) : String(x)}</dd></Fragment>)}
    </dl>
  );
}

export function EventDetail({ e }: { e: IntegrationEvent }) {
  const meta: [string, string | null][] = [
    ["Kanal", CHANNEL_LABEL[e.channel] ?? e.channel], ["Araç / uç nokta", e.tool], ["Protokol", [e.method, e.path].filter(Boolean).join(" ") || null],
    ["HTTP durumu", e.http_status ? String(e.http_status) : null], ["Süre", e.duration_ms != null ? `${e.duration_ms} ms` : null],
    ["Ajan adımı", e.step ? String(e.step) : null], ["İstemci", e.client], ["MCP oturumu", e.session_id], ["Sohbet", e.conversation_id],
    ["IP (hash)", e.ip_hash], ["Zaman", fmt(e.created_at)],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-1 text-xs">
        <p className="mb-1 text-sm font-semibold">Kaynak bilgisi</p>
        {meta.filter(([, v]) => v).map(([k, v]) => <p key={k}><span className="text-muted-foreground">{k}: </span><span className="break-all">{v}</span></p>)}
        {e.error && <p className="text-destructive">Hata: {e.error}</p>}
      </div>
      <div className="space-y-2"><p className="text-sm font-semibold">Gönderilen parametreler</p><ParamList v={e.params} /><Json v={e.params} /></div>
      <div className="space-y-2"><p className="text-sm font-semibold">Dönen sonuç</p><Json v={e.result} /></div>
      <p className="text-[11px] text-muted-foreground lg:col-span-3">Hasta TC, telefon, e-posta ve adı kayıt sırasında maskelenir.</p>
    </div>
  );
}

export function EventsTable({ events, showChannel = true }: { events: IntegrationEvent[]; showChannel?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "ok" | "error">("all");
  const rows = useMemo(() => events.filter((e) => (status === "all" || e.status === status) && (!q || `${e.tool} ${e.client ?? ""} ${e.session_id ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [events, q, status]);
  const byTool = useMemo(() => { const m = new Map<string, number>(); for (const e of events) m.set(e.tool, (m.get(e.tool) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]); }, [events]);
  const errors = events.filter((e) => e.status === "error").length;
  const avg = events.length ? Math.round(events.reduce((a, e) => a + (e.duration_ms ?? 0), 0) / events.length) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Toplam çağrı" value={String(events.length)} />
        <Stat label="Hatalı" value={String(errors)} />
        <Stat label="Ortalama süre" value={`${avg} ms`} />
        <Stat label="Farklı araç" value={String(byTool.length)} />
      </div>
      {byTool.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {byTool.map(([t, n]) => <button key={t} onClick={() => setQ(q === t ? "" : t)} className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${q === t ? "border-primary bg-primary text-primary-foreground" : "bg-primary-soft text-primary"}`}>{t} ×{n}</button>)}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Araç, istemci veya oturum ara" className="max-w-xs" />
        {(["all", "ok", "error"] as const).map((s) => <button key={s} onClick={() => setStatus(s)} className={`rounded-md border px-3 text-sm ${status === s ? "border-primary bg-primary-soft text-primary" : ""}`}>{s === "all" ? "Tümü" : s === "ok" ? "Başarılı" : "Hatalı"}</button>)}
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead className="w-8" /><TableHead>Zaman</TableHead>{showChannel && <TableHead>Kanal</TableHead>}<TableHead>Araç</TableHead><TableHead>İstemci</TableHead><TableHead>Durum</TableHead><TableHead className="text-right">Süre</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Kayıt yok.</TableCell></TableRow>}
            {rows.map((e) => (
              <Fragment key={e.id}>
                <TableRow className="cursor-pointer" onClick={() => setOpen(open === e.id ? null : e.id)}>
                  <TableCell>{open === e.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmt(e.created_at)}</TableCell>
                  {showChannel && <TableCell><Badge variant="secondary">{CHANNEL_LABEL[e.channel] ?? e.channel}</Badge></TableCell>}
                  <TableCell className="font-mono text-xs">{e.tool}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">{e.client ?? "—"}</TableCell>
                  <TableCell>{e.status === "ok" ? <Badge variant="outline" className="border-primary text-primary">Başarılı{e.http_status ? ` · ${e.http_status}` : ""}</Badge> : <Badge variant="destructive">Hata{e.http_status ? ` · ${e.http_status}` : ""}</Badge>}</TableCell>
                  <TableCell className="text-right text-xs">{e.duration_ms ?? "—"} ms</TableCell>
                </TableRow>
                {open === e.id && <TableRow><TableCell colSpan={7} className="bg-background p-4"><EventDetail e={e} /></TableCell></TableRow>}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>;
}
