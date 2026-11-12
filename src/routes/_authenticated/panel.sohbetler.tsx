import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Star } from "lucide-react";
import { ChatSourceDetails, readChatSources } from "@/components/ChatSourceDetails";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventDetail, EventsTable, useIntegrationEvents } from "@/components/IntegrationEvents";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/panel/sohbetler")({
  head: () => ({ meta: [{ title: "Medi AI Sohbetleri — Medicare Yönetim Paneli" }, { name: "description", content: "Medi AI ziyaretçi sohbetleri, kaynak incelemesi ve kalite puanları." }, { property: "og:title", content: "Medi AI Sohbetleri — Medicare Yönetim Paneli" }, { property: "og:description", content: "Ziyaretçi sohbetleri, RAG kaynakları ve kalite puanları." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ChatsPage,
});

const fmt = (s: string) => new Date(s).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });

function ChatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sohbetler ve Entegrasyon Kayıtları</h1>
        <p className="text-sm text-muted-foreground">Web sitesi sohbeti, MCP (Claude/ChatGPT) ve REST API üzerinden gelen tüm istekler, kullanılan araçlar ve parametreleri.</p>
      </div>
      <Tabs defaultValue="web">
        <TabsList>
          <TabsTrigger value="web">Web sohbetleri</TabsTrigger>
          <TabsTrigger value="mcp">MCP çağrıları</TabsTrigger>
          <TabsTrigger value="rest">API çağrıları</TabsTrigger>
          <TabsTrigger value="all">Tüm araç kayıtları</TabsTrigger>
        </TabsList>
        <TabsContent value="web" className="pt-4"><WebChats /></TabsContent>
        <TabsContent value="mcp" className="pt-4"><ChannelLog channel="mcp" /></TabsContent>
        <TabsContent value="rest" className="pt-4"><ChannelLog channel="rest" /></TabsContent>
        <TabsContent value="all" className="pt-4"><ChannelLog /></TabsContent>
      </Tabs>
    </div>
  );
}

function ChannelLog({ channel }: { channel?: string }) {
  const { data = [], isLoading } = useIntegrationEvents({ channel });
  if (isLoading) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;
  return <EventsTable events={data} showChannel={!channel} />;
}

function WebChats() {
  const [sel, setSel] = useState<string | null>(null);
  const { data: convs = [] } = useQuery({ queryKey: ["chat-convs"], queryFn: async () => {
    const { data, error } = await supabase.from("chat_conversations").select("id, message_count, created_at, updated_at, rating, feedback").gt("message_count", 0).order("updated_at", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  } });
  const { data: msgs = [] } = useQuery({ queryKey: ["chat-msgs", sel], enabled: !!sel, queryFn: async () => {
    if (!sel) return [];
    const { data, error } = await supabase.from("chat_messages").select("id, role, content, created_at, sources").eq("conversation_id", sel).order("created_at");
    if (error) throw error;
    return data ?? [];
  } });

  const { data: toolEvents = [] } = useIntegrationEvents({ channel: "web_chat", conversationId: sel });
  const rated = convs.filter((c) => c.rating);
  const avg = rated.length ? rated.reduce((a, c) => a + (c.rating ?? 0), 0) / rated.length : 0;
  const current = convs.find((c) => c.id === sel);
  const srcCount = new Map<string, { title: string; n: number }>();
  for (const m of msgs) for (const s of readChatSources(m.sources)) srcCount.set(s.id, { title: s.title, n: (srcCount.get(s.id)?.n ?? 0) + 1 });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Toplam sohbet" value={String(convs.length)} />
        <Stat label="Puanlanan" value={`${rated.length}${convs.length ? ` (%${Math.round((rated.length / convs.length) * 100)})` : ""}`} />
        <Stat label="Ortalama puan" value={rated.length ? `${avg.toFixed(1)} / 5` : "—"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="max-h-[70vh] space-y-2 overflow-y-auto">
          {convs.length === 0 && <p className="text-sm text-muted-foreground">Henüz sohbet yok.</p>}
          {convs.map((c) => (
            <Button variant="outline" key={c.id} onClick={() => setSel(c.id)} className={`h-auto w-full flex-col items-start gap-0 whitespace-normal rounded-lg p-3 text-left text-sm ${sel === c.id ? "border-primary bg-primary-soft" : "bg-card hover:border-primary"}`}>
              <p className="font-medium">{fmt(c.updated_at)}</p>
              <p className="text-xs text-muted-foreground">{c.message_count} mesaj · başlangıç {fmt(c.created_at)}</p>
              {c.rating ? <Stars n={c.rating} /> : <p className="mt-1 text-[11px] text-muted-foreground">Puanlanmadı</p>}
            </Button>
          ))}
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto rounded-xl border bg-card p-4">
          {!sel && <p className="text-sm text-muted-foreground">Bir sohbet seçin.</p>}
          {current && (current.rating || srcCount.size > 0) && (
            <div className="space-y-2 rounded-xl border bg-background p-3 text-sm">
              {current.rating && <div className="flex items-center gap-2"><span className="font-medium">Ziyaretçi puanı:</span><Stars n={current.rating} />{current.feedback && <span className="text-muted-foreground">“{current.feedback}”</span>}</div>}
              {srcCount.size > 0 && <div><span className="font-medium">Bu sohbette modele getirilen RAG kaynakları:</span>
                <div className="mt-1 flex flex-wrap gap-1.5">{[...srcCount.values()].map((s) => <span key={s.title} className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">{s.title} ×{s.n}</span>)}</div></div>}
            </div>
          )}
          {sel && toolEvents.length > 0 && (
            <details className="rounded-xl border bg-background p-3 text-sm">
              <summary className="cursor-pointer font-medium">Bu sohbette kullanılan araçlar ({toolEvents.length}) · {[...new Set(toolEvents.map((e) => e.tool))].join(", ")}</summary>
              <div className="mt-3 space-y-3">{toolEvents.map((e) => <details key={e.id} className="rounded-lg border p-2"><summary className="cursor-pointer font-mono text-xs">{e.step ? `#${e.step} ` : ""}{e.tool} · {e.status === "ok" ? "başarılı" : "hata"} · {e.duration_ms} ms</summary><div className="mt-2"><EventDetail e={e} /></div></details>)}</div>
            </details>
          )}
          {msgs.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex"}>
              <div className={m.role === "user" ? "max-w-[75%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground" : "medi-md max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm"}>
                {m.role === "user" ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
                {m.role === "assistant" && <ChatSourceDetails sources={readChatSources(m.sources)} />}
                <p className="mt-1 text-[10px] opacity-60">{fmt(m.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return <span className="mt-1 inline-flex gap-0.5" aria-label={`${n} / 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-3.5 w-3.5 ${i <= n ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />)}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>;
}
