import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperadmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "superadmin" });
  if (!data) throw new Error("Bu işlem için süper yönetici yetkisi gerekir");
}

export const listStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("id, user_id, role, active");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const all = users?.users ?? [];
    const staff = (roles ?? []).map((r) => ({ ...r, email: all.find((u) => u.id === r.user_id)?.email ?? "?" }));
    const pending = all
      .filter((u) => !(roles ?? []).some((r) => r.user_id === u.id))
      .map((u) => ({ user_id: u.id, email: u.email ?? "?", confirmed: !!u.email_confirmed_at, created_at: u.created_at }));
    return { staff, pending };
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), role: z.enum(["admin", "reception"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId).maybeSingle();
    if (existing?.role === "superadmin") return { ok: false as const, error: "Süper yönetici yetkisi değiştirilemez" };
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (!u?.user?.email_confirmed_at) return { ok: false as const, error: "Kullanıcı e-postasını onaylamamış" };
    const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("user_roles").select("user_id, role").eq("id", data.id).single();
    if (row?.role === "superadmin") return { ok: false as const, error: "Süper yönetici yetkisi kaldırılamaz" };
    await supabaseAdmin.from("user_roles").delete().eq("id", data.id);
    return { ok: true as const };
  });

export const setStaffActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("user_roles").select("role").eq("id", data.id).single();
    if (!row) return { ok: false as const, error: "Kullanıcı bulunamadı" };
    if (row.role === "superadmin") return { ok: false as const, error: "Süper yönetici pasife alınamaz" };
    const { error } = await supabaseAdmin.from("user_roles").update({ active: data.active }).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
