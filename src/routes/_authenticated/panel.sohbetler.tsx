import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { BookOpen, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/panel/sohbetler")({
  head: () => ({ meta: [{ title: "Sohbetler — Yönetim Paneli" }, { name: "description", content: "Medi AI ziyaretçi sohbetleri" }, { property: "og:title", content: "Sohbetler" }, { property: "og:description", content: "Medi AI ziyaretçi sohbetleri" }] }),
  component: ChatsPage,
});

const fmt = (s: string) => new Date(s).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });

function ChatsPage() {
  const [sel, setSel] = useState<string | null>(null);
  const { data: convs = [] } = useQuery({ queryKey: ["chat-convs"], queryFn: async () => {
    const { data, error } = await supabase.from("chat_conversations").select("id, message_count, created_at, updated_at, rating, feedback").gt("message_count", 0).order("updated_at", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  } });
  const { data: msgs = [] } = useQuery({ queryKey: ["chat-msgs", sel], enabled: !!sel, queryFn: async () => {
    const { data, error } = await supabase.from("chat_messages").select("id, role, content, created_at, sources").eq("conversation_id", sel!).order("created_at");
    if (error) throw error;
    return data ?? [];
  } });

  const rated = convs.filter((c) => c.rating);
  const avg = rated.length ? rated.reduce((a, c) => a + (c.rating ?? 0), 0) / rated.length : 0;
  const current = convs.find((c) => c.id === sel);
  const srcCount = new Map<string, { title: string; n: number }>();
  for (const m of msgs) for (const s of (m.sources as Src[] | null) ?? []) srcCount.set(s.id, { title: s.title, n: (srcCount.get(s.id)?.n ?? 0) + 1 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sohbetler</h1>
        <p className="text-sm text-muted-foreground">Ziyaretçilerin Medi AI ile yaptığı görüşmeler.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Toplam sohbet" value={String(convs.length)} />
        <Stat label="Puanlanan" value={`${rated.length}${convs.length ? ` (%${Math.round((rated.length / convs.length) * 100)})` : ""}`} />
        <Stat label="Ortalama puan" value={rated.length ? `${avg.toFixed(1)} / 5` : "—"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="max-h-[70vh] space-y-2 overflow-y-auto">
          {convs.length === 0 && <p className="text-sm text-muted-foreground">Henüz sohbet yok.</p>}
          {convs.map((c) => (
            <button key={c.id} onClick={() => setSel(c.id)} className={`w-full rounded-xl border p-3 text-left text-sm ${sel === c.id ? "border-primary bg-primary-soft" : "bg-card hover:border-primary"}`}>
              <p className="font-medium">{fmt(c.updated_at)}</p>
              <p className="text-xs text-muted-foreground">{c.message_count} mesaj · başlangıç {fmt(c.created_at)}</p>
              {c.rating ? <Stars n={c.rating} /> : <p className="mt-1 text-[11px] text-muted-foreground">Puanlanmadı</p>}
            </button>
          ))}
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto rounded-xl border bg-card p-4">
          {!sel && <p className="text-sm text-muted-foreground">Bir sohbet seçin.</p>}
          {current && (current.rating || srcCount.size > 0) && (
            <div className="space-y-2 rounded-xl border bg-background p-3 text-sm">
              {current.rating && <div className="flex items-center gap-2"><span className="font-medium">Ziyaretçi puanı:</span><Stars n={current.rating} />{current.feedback && <span className="text-muted-foreground">“{current.feedback}”</span>}</div>}
              {srcCount.size > 0 && <div><span className="font-medium">Bu sohbette kullanılan kaynaklar:</span>
                <div className="mt-1 flex flex-wrap gap-1.5">{[...srcCount.values()].map((s) => <span key={s.title} className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">{s.title} ×{s.n}</span>)}</div></div>}
            </div>
          )}
          {msgs.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex"}>
              <div className={m.role === "user" ? "max-w-[75%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground" : "medi-md max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm"}>
                {m.role === "user" ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
                {m.role === "assistant" && ((m.sources as Src[] | null) ?? []).length > 0 && (
                  <div className="mt-2 border-t pt-2">
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><BookOpen className="h-3 w-3" /> RAG kaynakları</p>
                    <ul className="mt-1 space-y-0.5">
                      {(m.sources as Src[]).map((s) => <li key={s.id} className="text-[11px] text-muted-foreground">• {s.title}{s.similarity != null && <span className="ml-1 opacity-70">(benzerlik {s.similarity.toFixed(2)})</span>}{s.query && <span className="ml-1 italic opacity-70">— “{s.query}”</span>}</li>)}
                    </ul>
                  </div>
                )}
                <p className="mt-1 text-[10px] opacity-60">{fmt(m.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type Src = { id: string; title: string; similarity: number | null; query: string };

function Stars({ n }: { n: number }) {
  return <span className="mt-1 inline-flex gap-0.5" aria-label={`${n} / 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-3.5 w-3.5 ${i <= n ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />)}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>;
}
