import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/hospital";
import { grantRole, listStaff, revokeRole, setStaffActive } from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/panel/ayarlar")({
  head: () => ({ meta: [{ title: "Ayarlar — Yönetim Paneli" }, { name: "description", content: "Kapalı günler ve kullanıcılar" }, { property: "og:title", content: "Ayarlar" }, { property: "og:description", content: "Kapalı günler ve kullanıcılar" }] }),
  beforeLoad: ({ context }) => {
    if (!context.roles.includes("superadmin")) throw redirect({ to: "/panel" });
  },
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ayarlar</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <ClosedDays />
        <Staff />
      </div>
    </div>
  );
}

function ClosedDays() {
  const qc = useQueryClient();
  const [day, setDay] = useState("");
  const [reason, setReason] = useState("");
  const { data = [] } = useQuery({ queryKey: ["closed-days-panel"], queryFn: async () => (await supabase.from("closed_days").select("*").order("day")).data ?? [] });
  async function add() {
    if (!day) return;
    const from = new Date(`${day}T00:00:00+03:00`).toISOString();
    const to = new Date(new Date(from).getTime() + 86400000).toISOString();
    const { count } = await supabase.from("appointments").select("id", { count: "exact", head: true })
      .in("status", ["pending", "confirmed"]).gte("starts_at", from).lt("starts_at", to);
    if (count && !confirm(`Bu tarihte ${count} aktif randevu var. Hepsi iptal edilecek. Devam edilsin mi?`)) return;
    const { error } = await supabase.from("closed_days").upsert({ day, reason: reason || null });
    if (error) { toast.error(error.message); return; }
    toast.success(count ? `Tatil eklendi, ${count} randevu iptal edildi` : "Tatil eklendi");
    setDay(""); setReason("");
    qc.invalidateQueries({ queryKey: ["closed-days-panel"] });
    qc.invalidateQueries({ queryKey: ["appointments"] });
  }
  async function remove(d: string) {
    await supabase.from("closed_days").delete().eq("day", d); qc.invalidateQueries({ queryKey: ["closed-days-panel"] });
  }
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold">Tatil / kapalı günler</h2>
      <p className="text-sm text-muted-foreground">Bu günlerde online randevu alınamaz.</p>
      <div className="mt-4 flex gap-2">
        <Input type="date" className="w-44" value={day} onChange={(e) => setDay(e.target.value)} />
        <Input placeholder="Açıklama (ör. Bayram)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button onClick={add}>Ekle</Button>
      </div>
      <div className="mt-4 divide-y">
        {data.map((c) => (
          <div key={c.day} className="flex items-center justify-between py-2 text-sm">
            <span>{fmtDate(c.day)} <span className="text-muted-foreground">{c.reason}</span></span>
            <Button size="icon" variant="ghost" onClick={() => remove(c.day)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </section>
  );
}

const ROLE_LABEL: Record<string, string> = { superadmin: "Süper yönetici", admin: "Yönetici", reception: "Resepsiyon" };

function Staff() {
  const qc = useQueryClient();
  const list = useServerFn(listStaff);
  const grant = useServerFn(grantRole);
  const revoke = useServerFn(revokeRole);
  const setActive = useServerFn(setStaffActive);
  async function toggle(id: string, active: boolean) {
    const r = await setActive({ data: { id, active } });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(active ? "Kullanıcı aktif edildi" : "Kullanıcı pasife alındı");
    qc.invalidateQueries({ queryKey: ["staff"] });
  }
  const [roleFor, setRoleFor] = useState<Record<string, "admin" | "reception">>({});
  const { data } = useQuery({ queryKey: ["staff"], queryFn: () => list() });

  async function approve(userId: string) {
    const r = await grant({ data: { userId, role: roleFor[userId] ?? "admin" } });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Kullanıcı onaylandı"); qc.invalidateQueries({ queryKey: ["staff"] });
  }
  async function remove(id: string) {
    if (!confirm("Bu kullanıcının yetkisi kaldırılsın mı? Tekrar onay bekler duruma düşer.")) return;
    const r = await revoke({ data: { id } });
    if (!r.ok) { toast.error(r.error); return; }
    qc.invalidateQueries({ queryKey: ["staff"] });
  }
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold">Onay bekleyen kullanıcılar</h2>
      <p className="text-sm text-muted-foreground">Kayıt olan kişiler siz onaylayana kadar panelde işlem yapamaz.</p>
      <div className="mt-3 divide-y">
        {data?.pending.map((u) => (
          <div key={u.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span>{u.email} {!u.confirmed && <span className="text-xs text-warning">· e-posta onaylanmadı</span>}</span>
            <div className="flex gap-2">
              <Select value={roleFor[u.user_id] ?? "admin"} onValueChange={(v) => setRoleFor({ ...roleFor, [u.user_id]: v as "admin" | "reception" })}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="admin">Yönetici</SelectItem><SelectItem value="reception">Resepsiyon</SelectItem></SelectContent>
              </Select>
              <Button size="sm" disabled={!u.confirmed} onClick={() => approve(u.user_id)}>Onayla</Button>
            </div>
          </div>
        ))}
        {data?.pending.length === 0 && <p className="py-3 text-sm text-muted-foreground">Bekleyen kullanıcı yok.</p>}
      </div>
      <h2 className="mt-6 font-semibold">Panel kullanıcıları</h2>
      <div className="mt-3 divide-y">
        {data?.staff.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2 text-sm">
            <span className={s.active || s.role === "superadmin" ? "" : "text-muted-foreground line-through"}>{s.email} <span className="text-muted-foreground">· {ROLE_LABEL[s.role] ?? s.role}</span></span>
            {s.role !== "superadmin" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{s.active ? "Aktif" : "Pasif"}</span>
                <Switch checked={s.active} onCheckedChange={(v) => toggle(s.id, v)} aria-label="Aktif/pasif" />
                <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
