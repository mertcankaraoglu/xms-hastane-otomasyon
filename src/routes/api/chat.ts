import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  id: z.string().uuid(),
  token: z.string().min(10).max(100),
  message: z.string().trim().min(1).max(2000),
});

// Streams Medi AI's reply as plain text chunks. Access is gated by the
// per-conversation token checked inside the chat_* RPCs.
export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Geçersiz istek", { status: 400 });
        const data = parsed.data;
        const { pubClient, runAgent } = await import("@/lib/medi-ai.server");
        const sb = pubClient();
        const { error: e1 } = await sb.rpc("chat_append", { _id: data.id, _token: data.token, _role: "user", _content: data.message });
        if (e1) {
          if (e1.message.includes("limit")) return new Response("Bu sohbet mesaj sınırına ulaştı. Lütfen **Yeni sohbet** başlatın.", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
          return new Response("Sohbet bulunamadı", { status: 403 });
        }
        const { data: rows } = await sb.rpc("chat_history", { _id: data.id, _token: data.token });
        const history = (rows ?? []).slice(-30).map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));

        const enc = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const { ipHash } = await import("@/lib/event-log.server");
            const ctx = { conversationId: data.id, ipHash: await ipHash(request), client: request.headers.get("user-agent")?.slice(0, 300) ?? null };
            const { text: reply, sources } = await runAgent(history, (t) => controller.enqueue(enc.encode(t)), ctx);
            const { error: e2 } = await (await (await import("@/lib/medi-ai.server")).adminClient()).rpc("chat_append_assistant", { _id: data.id, _token: data.token, _content: reply.slice(0, 8000), _sources: sources as any });
            if (e2) console.error("assistant message save failed", e2.message);
            controller.close();
          },
        });
        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
      },
    },
  },
});
