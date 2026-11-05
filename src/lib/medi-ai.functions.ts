import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Conv = z.object({ id: z.string().uuid(), token: z.string().min(10).max(100) });

export const chatStart = createServerFn({ method: "POST" }).handler(async () => {
  const { pubClient } = await import("@/lib/medi-ai.server");
  const { data, error } = await pubClient().rpc("chat_start");
  if (error || !data?.[0]) throw new Error("Sohbet başlatılamadı");
  return { id: data[0].id as string, token: data[0].token as string };
});

export const chatHistory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Conv.parse(d))
  .handler(async ({ data }) => {
    const { pubClient } = await import("@/lib/medi-ai.server");
    const { data: rows, error } = await pubClient().rpc("chat_history", { _id: data.id, _token: data.token });
    if (error) return { ok: false as const, messages: [] };
    return { ok: true as const, messages: (rows ?? []).map((r) => ({ role: r.role as "user" | "assistant", content: r.content })) };
  });

export const chatSend = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Conv.extend({ message: z.string().trim().min(1).max(2000) }).parse(d))
  .handler(async ({ data }) => {
    const { pubClient, runAgent } = await import("@/lib/medi-ai.server");
    const sb = pubClient();
    const { error: e1 } = await sb.rpc("chat_append", { _id: data.id, _token: data.token, _role: "user", _content: data.message });
    if (e1) {
      if (e1.message.includes("limit")) return { reply: "Bu sohbet mesaj sınırına ulaştı. Lütfen **Yeni sohbet** başlatın." };
      throw new Error("Mesaj kaydedilemedi");
    }
    const { data: rows } = await sb.rpc("chat_history", { _id: data.id, _token: data.token });
    const history = (rows ?? []).slice(-30).map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));
    const { text: reply, sources } = await runAgent(history);
    const { error: e2 } = await sb.rpc("chat_append_assistant", { _id: data.id, _token: data.token, _content: reply.slice(0, 8000), _sources: sources as any });
    if (e2) console.error("assistant message save failed", e2.message);
    return { reply };
  });

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_staff", { _user_id: userId });
  if (!data) throw new Error("Yetkiniz yok");
}

export const saveKbArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().nullable(), title: z.string().trim().min(2).max(200),
    category: z.string().trim().min(1).max(60), content: z.string().trim().min(5).max(6000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { embed } = await import("@/lib/medi-ai.server");
    const [v] = await embed([`${data.title}\n${data.category}\n${data.content}`]);
    const row = { title: data.title, category: data.category, content: data.content, embedding: JSON.stringify(v), updated_at: new Date().toISOString() };
    const q = data.id
      ? context.supabase.from("kb_articles").update(row).eq("id", data.id)
      : context.supabase.from("kb_articles").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reindexKb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { embed } = await import("@/lib/medi-ai.server");
    const { data: rows, error } = await context.supabase.from("kb_articles").select("id, title, category, content");
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const vecs = list.length ? await embed(list.map((r) => `${r.title}\n${r.category}\n${r.content}`)) : [];
    for (let i = 0; i < list.length; i++) {
      const { error: e } = await context.supabase.from("kb_articles").update({ embedding: JSON.stringify(vecs[i]) }).eq("id", list[i]!.id);
      if (e) throw new Error(e.message);
    }
    return { count: list.length };
  });
