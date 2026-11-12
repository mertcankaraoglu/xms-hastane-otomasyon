import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { HOSPITAL_NAME } from "@/lib/hospital";
import { OPS, type Op } from "@/lib/public-api.openapi";

const T = `Geliştirici API — ${HOSPITAL_NAME}`;
const D = "Hastane bilgileri, boş saatler ve randevu işlemleri için herkese açık REST API dokümantasyonu.";

export const Route = createFileRoute("/api-docs")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D },
    { property: "og:title", content: T }, { property: "og:description", content: D },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: ApiDocs,
});

const BASE = "/api/public/v1";

function ApiDocs() {
  const tags = [...new Set(OPS.map((o) => o.tag))];
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12">
        <h1 className="font-display text-4xl font-semibold text-foreground">Geliştirici API</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{D} Anahtar gerekmez; IP başına dakikada 120 okuma ve 10 randevu işlemi sınırı vardır. Tüm saatler İstanbul saatidir.</p>
        <div className="mt-5 flex flex-wrap gap-2"><Button asChild><Link to="/api-docs/swagger">Swagger görünümü</Link></Button><Button asChild variant="outline"><Link to="/mcp-baglanti">Claude / ChatGPT (MCP)</Link></Button></div>
        <div className="mt-6 grid gap-3 rounded-xl border bg-card p-5 text-sm sm:grid-cols-3">
          <div><div className="text-muted-foreground">Temel adres</div><code className="font-mono">{BASE}</code></div>
          <div><div className="text-muted-foreground">Hata biçimi</div><code className="font-mono">{"{ error: { code, message } }"}</code></div>
          <div><div className="text-muted-foreground">OpenAPI</div><a className="font-mono text-primary underline" href={`${BASE}/openapi.json`} target="_blank" rel="noreferrer">openapi.json</a></div>
        </div>
        {tags.map((t) => (
          <section key={t} className="mt-10">
            <h2 className="font-display text-2xl font-semibold text-foreground">{t}</h2>
            <div className="mt-4 space-y-4">{OPS.filter((o) => o.tag === t).map((o) => <OpCard key={o.method + o.path} op={o} />)}</div>
          </section>
        ))}
      </main>
      <PublicFooter />
    </div>
  );
}

function OpCard({ op }: { op: Op }) {
  const pathParams = (op.parameters ?? []).filter((p) => p.in === "path");
  const queryParams = (op.parameters ?? []).filter((p) => p.in === "query");
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries((op.parameters ?? []).map((p) => [p.name, p.example ?? ""])));
  const [body, setBody] = useState(op.example ? JSON.stringify(op.example, null, 2) : "");
  const [res, setRes] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      let p = op.path;
      for (const pp of pathParams) p = p.replace(`{${pp.name}}`, encodeURIComponent(vals[pp.name] ?? ""));
      const qs = new URLSearchParams(queryParams.filter((q) => vals[q.name]).map((q) => [q.name, vals[q.name]!]));
      const r = await fetch(`${BASE}${p}${qs.size ? `?${qs}` : ""}`, op.method === "post" ? { method: "POST", headers: { "Content-Type": "application/json" }, body } : undefined);
      const txt = await r.text();
      let pretty = txt; try { pretty = JSON.stringify(JSON.parse(txt), null, 2); } catch { /* raw */ }
      setRes(`HTTP ${r.status}\n${pretty}`);
    } catch (e) { setRes(String(e)); } finally { setBusy(false); }
  }

  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer items-center gap-3 p-4">
        <Badge variant={op.method === "get" ? "secondary" : "default"} className="w-14 justify-center font-mono uppercase">{op.method}</Badge>
        <code className="font-mono text-sm text-foreground">{op.path}</code>
        <span className="ml-auto text-sm text-muted-foreground">{op.summary}</span>
      </summary>
      <div className="space-y-3 border-t p-4">
        {op.description && <p className="text-sm text-muted-foreground">{op.description}</p>}
        {(op.parameters ?? []).map((p) => (
          <label key={p.name} className="grid gap-1 text-sm sm:grid-cols-[160px_1fr] sm:items-center">
            <span className="font-mono">{p.name}{p.required ? " *" : ""} <span className="text-xs text-muted-foreground">({p.in})</span></span>
            <Input value={vals[p.name] ?? ""} placeholder={p.description} onChange={(e) => setVals({ ...vals, [p.name]: e.target.value })} />
          </label>
        ))}
        {op.method === "post" && <Textarea className="font-mono text-xs" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />}
        <Button size="sm" onClick={run} disabled={busy}>{busy ? "Gönderiliyor…" : "Dene"}</Button>
        {res && <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs text-foreground">{res}</pre>}
      </div>
    </details>
  );
}
