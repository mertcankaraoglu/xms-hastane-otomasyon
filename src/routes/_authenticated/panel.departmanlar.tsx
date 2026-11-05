import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
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

type Faq = { question: string; answer: string };
type Form = { id?: string; name: string; description: string; icon: string; sort_order: number; short_description: string; long_description: string; services: string; cover_url: string; faqs: Faq[] };

function DeptPage() {
  const qc = useQueryClient();
  const { data: depts = [] } = useQuery(departmentsQuery);
  const { data: doctors = [] } = useQuery(doctorsQuery);
  const [form, setForm] = useState<Form | null>(null);

  async function save() {
    if (!form || form.name.trim().length < 2) { toast.error("Ad girin"); return; }
    const payload = { name: form.name.trim(), description: form.description, icon: form.icon, sort_order: form.sort_order,
      short_description: form.short_description || null, long_description: form.long_description || null,
      services: form.services.split("\n").map((x) => x.trim()).filter(Boolean), cover_url: form.cover_url.trim() || null };
    const res = form.id ? await supabase.from("departments").update(payload).eq("id", form.id).select("id").single() : await supabase.from("departments").insert(payload).select("id").single();
    if (res.error) { toast.error(res.error.message); return; }
    const deptId = res.data.id;
    await supabase.from("department_faqs").delete().eq("department_id", deptId);
    const faqs = form.faqs.filter((f) => f.question.trim() && f.answer.trim()).map((f, i) => ({ department_id: deptId, question: f.question.trim(), answer: f.answer.trim(), sort_order: i + 1 }));
    if (faqs.length) { const { error } = await supabase.from("department_faqs").insert(faqs); if (error) { toast.error(error.message); return; } }
    toast.success("Kaydedildi");
    setForm(null); qc.invalidateQueries({ queryKey: ["departments"] });
  }
  async function openEdit(d: (typeof depts)[number]) {
    const { data: faqs } = await supabase.from("department_faqs").select("question, answer").eq("department_id", d.id).order("sort_order");
    setForm({ id: d.id, name: d.name, description: d.description ?? "", icon: d.icon, sort_order: d.sort_order, short_description: d.short_description ?? "",
      long_description: d.long_description ?? "", services: (d.services ?? []).join("\n"), cover_url: d.cover_url ?? "", faqs: faqs ?? [] });
  }
  async function remove(id: string) {
    if (!confirm("Departman ve bağlı tüm doktorlar silinecek. Emin misiniz?")) return;
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["departments"] }); qc.invalidateQueries({ queryKey: ["doctors"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Departmanlar</h1>
        <Button onClick={() => setForm({ name: "", description: "", icon: "stethoscope", sort_order: depts.length + 1, short_description: "", long_description: "", services: "", cover_url: "", faqs: [] })}><Plus className="h-4 w-4" /> Yeni</Button>
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
                  <Button size="icon" variant="ghost" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
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
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Departmanı düzenle" : "Yeni departman"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3">
              <div className="grid gap-1.5"><Label>Ad</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Panel açıklaması</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Kısa tanıtım (sitede başlık altında)</Label><Textarea rows={2} value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Hakkında (paragrafları boş satırla ayırın)</Label><Textarea rows={6} value={form.long_description} onChange={(e) => setForm({ ...form, long_description: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Tedavi ve hizmetler (her satıra bir tane)</Label><Textarea rows={5} value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Kapak görseli bağlantısı (https://...)</Label><Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} /></div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between"><Label>Sıkça sorulan sorular</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, faqs: [...form.faqs, { question: "", answer: "" }] })}><Plus className="h-4 w-4" /> Soru ekle</Button></div>
                {form.faqs.map((f, i) => (
                  <div key={i} className="grid gap-2 rounded-md border p-3">
                    <div className="flex gap-2">
                      <Input placeholder="Soru" value={f.question} onChange={(e) => setForm({ ...form, faqs: form.faqs.map((x, j) => j === i ? { ...x, question: e.target.value } : x) })} />
                      <Button type="button" size="icon" variant="ghost" disabled={i === 0} onClick={() => { const a = [...form.faqs]; [a[i - 1], a[i]] = [a[i]!, a[i - 1]!]; setForm({ ...form, faqs: a }); }}><ArrowUp className="h-4 w-4" /></Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => setForm({ ...form, faqs: form.faqs.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <Textarea rows={2} placeholder="Cevap" value={f.answer} onChange={(e) => setForm({ ...form, faqs: form.faqs.map((x, j) => j === i ? { ...x, answer: e.target.value } : x) })} />
                  </div>
                ))}
              </div>
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
