<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Staff panel lives under `src/routes/_authenticated/panel.*`; access = any row in `user_roles` (superadmin/admin/reception), checked by `is_staff()` in RLS. Users with no role see "awaiting approval". Settings (closed days, user approval) is superadmin-only, enforced in RLS and server functions.
- Anonymous patients never touch tables directly; public booking/lookup/cancel go through SECURITY DEFINER RPCs (`book_appointment`, `lookup_appointment`, `cancel_appointment_public`, `get_booked_slots`) so patient data stays private.
- Double booking is prevented by a partial unique index on (doctor_id, starts_at) excluding cancelled rows — keep it as the source of truth.
- All times are Europe/Istanbul (fixed UTC+3); slot math lives in `src/lib/slots.ts`.
- Medi AI chatbot: replies stream as plain text from `/api/chat` (not a server fn, since RPC cannot stream); agent loop + tools live in `src/lib/medi-ai.server.ts` (server-only); visitors reach chats only via token-checked SECURITY DEFINER RPCs (`chat_start/history/append`), never tables directly — keeps anonymous chats private while staff read via RLS.
- KB RAG uses 768-dim embeddings stored on `kb_articles.embedding`; always re-embed on save (`saveKbArticle`) so search stays consistent.
