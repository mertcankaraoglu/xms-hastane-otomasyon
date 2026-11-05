import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/hospital";
import { grantRole, listStaff, revokeRole } from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/panel/ayarlar")({
  head: () => ({ meta: [{ title: "Ayarlar — Yönetim Paneli" }, { name: "description", content: "Kapalı günler ve kullanıcılar" }, { property: "og:title", content: "Ayarlar" }, { property: "og:description", content: "Kapalı günler ve kullanıcılar" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { roles } = Route.useRouteContext();
  const isAdmin = roles.includes("admin");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ayarlar</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <ClosedDays />
        {isAdmin && <Staff />}
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
    const { error } = await supabase.from("closed_days").upsert({ day, reason: reason || null });
    if (error) { toast.error(error.message); return; }
    setDay(""); setReason(""); qc.invalidateQueries({ queryKey: ["closed-days-panel"] });
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

function Staff() {
  const qc = useQueryClient();
  const list = useServerFn(listStaff);
  const grant = useServerFn(grantRole);
  const revoke = useServerFn(revokeRole);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "reception">("reception");
  const { data = [] } = useQuery({ queryKey: ["staff"], queryFn: () => list() });

  async function add() {
    const r = await grant({ data: { email, role } });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Yetki verildi"); setEmail(""); qc.invalidateQueries({ queryKey: ["staff"] });
  }
  async function remove(id: string) {
    const r = await revoke({ data: { id } });
    if (!r.ok) { toast.error(r.error); return; }
    qc.invalidateQueries({ queryKey: ["staff"] });
  }
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold">Panel kullanıcıları</h2>
      <p className="text-sm text-muted-foreground">Kişi önce “Personel Girişi” sayfasından kayıt olmalı, sonra buradan yetki verin.</p>
      <div className="mt-4 flex gap-2">
        <Input placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select value={role} onValueChange={(v) => setRole(v as "admin" | "reception")}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="reception">Resepsiyon</SelectItem><SelectItem value="admin">Yönetici</SelectItem></SelectContent></Select>
        <Button onClick={add}>Yetki ver</Button>
      </div>
      <div className="mt-4 divide-y">
        {data.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2 text-sm">
            <span>{s.email} <span className="text-muted-foreground">· {s.role === "admin" ? "Yönetici" : "Resepsiyon"}</span></span>
            <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </section>
  );
}
