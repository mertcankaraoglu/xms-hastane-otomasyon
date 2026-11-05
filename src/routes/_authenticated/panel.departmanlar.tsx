import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { departmentsQuery, doctorsQuery } from "@/lib/panel-data";
import { deptIcons, iconFor } from "@/lib/hospital";

export const Route = createFileRoute("/_authenticated/panel/departmanlar")({
  head: () => ({ meta: [{ title: "Departmanlar — Yönetim Paneli" }, { name: "description", content: "Departman yönetimi" }, { property: "og:title", content: "Departmanlar" }, { property: "og:description", content: "Departman yönetimi" }] }),
  component: DeptPage,
});

type Form = { id?: string; name: string; description: string; icon: string; sort_order: number };

function DeptPage() {
  const qc = useQueryClient();
  const { data: depts = [] } = useQuery(departmentsQuery);
  const { data: doctors = [] } = useQuery(doctorsQuery);
  const [form, setForm] = useState<Form | null>(null);

  async function save() {
    if (!form || form.name.trim().length < 2) return toast.error("Ad girin");
    const payload = { name: form.name.trim(), description: form.description, icon: form.icon, sort_order: form.sort_order };
    const { error } = form.id ? await supabase.from("departments").update(payload).eq("id", form.id) : await supabase.from("departments").insert(payload);
    if (error) return toast.error(error.message);
    setForm(null); qc.invalidateQueries({ queryKey: ["departments"] });
  }
  async function remove(id: string) {
    if (!confirm("Departman ve bağlı tüm doktorlar silinecek. Emin misiniz?")) return;
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["departments"] }); qc.invalidateQueries({ queryKey: ["doctors"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Departmanlar</h1>
        <Button onClick={() => setForm({ name: "", description: "", icon: "stethoscope", sort_order: depts.length + 1 })}><Plus className="h-4 w-4" /> Yeni</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {depts.map((d) => {
          const Icon = iconFor(d.icon);
          const docs = doctors.filter((x) => x.department_id === d.id);
          return (
            <div key={d.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between">
                <Icon className="h-7 w-7 text-primary" />
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setForm({ id: d.id, name: d.name, description: d.description ?? "", icon: d.icon, sort_order: d.sort_order })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <h2 className="mt-2 font-semibold">{d.name}</h2>
              <p className="text-sm text-muted-foreground">{d.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">{docs.length} doktor · {docs.reduce((s, x) => s + (x.assistants?.length ?? 0), 0)} asistan</p>
            </div>
          );
        })}
      </div>
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Departmanı düzenle" : "Yeni departman"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3">
              <div className="grid gap-1.5"><Label>Ad</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Açıklama</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>İkon</Label>
                  <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.keys(deptIcons).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="grid gap-1.5"><Label>Sıra</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={save}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
