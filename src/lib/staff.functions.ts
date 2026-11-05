import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Bu işlem için yönetici yetkisi gerekir");
}

export const listStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("id, user_id, role");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    return (roles ?? []).map((r) => ({ ...r, email: users?.users.find((u) => u.id === r.user_id)?.email ?? "?" }));
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email(), role: z.enum(["admin", "reception"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const user = users?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!user) return { ok: false as const, error: "Bu e-postayla kayıtlı kullanıcı yok. Önce Personel Girişi sayfasından kayıt olmalı." };
    const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: user.id, role: data.role }, { onConflict: "user_id,role" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("user_roles").select("user_id").eq("id", data.id).single();
    if (row?.user_id === context.userId) return { ok: false as const, error: "Kendi yetkinizi kaldıramazsınız" };
    await supabaseAdmin.from("user_roles").delete().eq("id", data.id);
    return { ok: true as const };
  });
