import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/panel/sohbetler")({
  head: () => ({ meta: [{ title: "Sohbetler — Yönetim Paneli" }, { name: "description", content: "Medi AI ziyaretçi sohbetleri" }, { property: "og:title", content: "Sohbetler" }, { property: "og:description", content: "Medi AI ziyaretçi sohbetleri" }] }),
  component: ChatsPage,
});

const fmt = (s: string) => new Date(s).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });

function ChatsPage() {
  const [sel, setSel] = useState<string | null>(null);
  const { data: convs = [] } = useQuery({ queryKey: ["chat-convs"], queryFn: async () => {
    const { data, error } = await supabase.from("chat_conversations").select("id, message_count, created_at, updated_at").gt("message_count", 0).order("updated_at", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  } });
  const { data: msgs = [] } = useQuery({ queryKey: ["chat-msgs", sel], enabled: !!sel, queryFn: async () => {
    const { data, error } = await supabase.from("chat_messages").select("id, role, content, created_at").eq("conversation_id", sel!).order("created_at");
    if (error) throw error;
    return data ?? [];
  } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sohbetler</h1>
        <p className="text-sm text-muted-foreground">Ziyaretçilerin Medi AI ile yaptığı görüşmeler.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="max-h-[70vh] space-y-2 overflow-y-auto">
          {convs.length === 0 && <p className="text-sm text-muted-foreground">Henüz sohbet yok.</p>}
          {convs.map((c) => (
            <button key={c.id} onClick={() => setSel(c.id)} className={`w-full rounded-xl border p-3 text-left text-sm ${sel === c.id ? "border-primary bg-primary-soft" : "bg-card hover:border-primary"}`}>
              <p className="font-medium">{fmt(c.updated_at)}</p>
              <p className="text-xs text-muted-foreground">{c.message_count} mesaj · başlangıç {fmt(c.created_at)}</p>
            </button>
          ))}
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto rounded-xl border bg-card p-4">
          {!sel && <p className="text-sm text-muted-foreground">Bir sohbet seçin.</p>}
          {msgs.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex"}>
              <div className={m.role === "user" ? "max-w-[75%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground" : "medi-md max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm"}>
                {m.role === "user" ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
                <p className="mt-1 text-[10px] opacity-60">{fmt(m.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
