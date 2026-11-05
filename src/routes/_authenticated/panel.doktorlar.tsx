import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { departmentsQuery, doctorsQuery } from "@/lib/panel-data";
import type { WorkingHours } from "@/lib/slots";

export const Route = createFileRoute("/_authenticated/panel/doktorlar")({
  head: () => ({ meta: [{ title: "Doktorlar — Yönetim Paneli" }, { name: "description", content: "Doktor yönetimi" }, { property: "og:title", content: "Doktorlar" }, { property: "og:description", content: "Doktor yönetimi" }] }),
  component: DoctorsPage,
});

const DAYS = [["1", "Pazartesi"], ["2", "Salı"], ["3", "Çarşamba"], ["4", "Perşembe"], ["5", "Cuma"], ["6", "Cumartesi"], ["7", "Pazar"]] as const;
const DEFAULT_HOURS: WorkingHours = { "1": ["09:00", "17:00"], "2": ["09:00", "17:00"], "3": ["09:00", "17:00"], "4": ["09:00", "17:00"], "5": ["09:00", "17:00"] };

type Form = { id?: string; department_id: string; full_name: string; title: string; specialty: string; bio: string; slot_minutes: number; working_hours: WorkingHours; active: boolean };

function DoctorsPage() {
  const qc = useQueryClient();
  const { data: depts = [] } = useQuery(departmentsQuery);
  const { data: doctors = [] } = useQuery(doctorsQuery);
  const [dept, setDept] = useState("all");
  const [form, setForm] = useState<Form | null>(null);
  const [asstFor, setAsstFor] = useState<string | null>(null);
  const [asst, setAsst] = useState({ full_name: "", phone: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["doctors"] });

  async function save() {
    if (!form || form.full_name.trim().length < 3 || !form.department_id) { toast.error("Ad ve departman zorunlu"); return; }
    const { id, ...payload } = form;
    const { error } = id ? await supabase.from("doctors").update(payload).eq("id", id) : await supabase.from("doctors").insert(payload);
    if (error) { toast.error(error.message); return; }
    setForm(null); refresh();
  }
  async function remove(id: string) {
    if (!confirm("Doktor ve tüm randevuları silinecek. Bunun yerine pasif yapmayı düşünün. Devam?")) return;
    const { error } = await supabase.from("doctors").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }
  async function addAsst() {
    if (!asstFor || asst.full_name.trim().length < 3) return;
    const { error } = await supabase.from("assistants").insert({ doctor_id: asstFor, full_name: asst.full_name.trim(), phone: asst.phone || null });
    if (error) { toast.error(error.message); return; }
    setAsst({ full_name: "", phone: "" }); refresh();
  }
  async function removeAsst(id: string) {
    await supabase.from("assistants").delete().eq("id", id); refresh();
  }

  const list = doctors.filter((d) => dept === "all" || d.department_id === dept);
  const asstDoctor = doctors.find((d) => d.id === asstFor);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Doktorlar</h1>
        <div className="flex gap-2">
          <Select value={dept} onValueChange={setDept}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tüm departmanlar</SelectItem>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
          <Button onClick={() => setForm({ department_id: dept === "all" ? "" : dept, full_name: "", title: "Uzm. Dr.", specialty: "", bio: "", slot_minutes: 20, working_hours: DEFAULT_HOURS, active: true })}><Plus className="h-4 w-4" /> Yeni</Button>
        </div>
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Doktor</TableHead><TableHead>Departman</TableHead><TableHead>Süre</TableHead><TableHead>Asistanlar</TableHead><TableHead>Durum</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {list.map((d) => (
              <TableRow key={d.id}>
                <TableCell><p className="font-medium">{d.title} {d.full_name}</p><p className="text-xs text-muted-foreground">{d.specialty}</p></TableCell>
                <TableCell>{d.departments?.name}</TableCell>
                <TableCell>{d.slot_minutes} dk</TableCell>
                <TableCell><button className="text-sm hover:text-primary" onClick={() => setAsstFor(d.id)}>{d.assistants?.length ? d.assistants.map((a) => a.full_name).join(", ") : <span className="text-muted-foreground">+ ekle</span>}</button></TableCell>
                <TableCell>{d.active ? <span className="text-success">Aktif</span> : <span className="text-muted-foreground">Pasif</span>}</TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <Button size="icon" variant="ghost" onClick={() => setForm({ id: d.id, department_id: d.department_id, full_name: d.full_name, title: d.title, specialty: d.specialty ?? "", bio: d.bio ?? "", slot_minutes: d.slot_minutes, working_hours: d.working_hours as WorkingHours, active: d.active })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Doktoru düzenle" : "Yeni doktor"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3">
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <div className="grid gap-1.5"><Label>Unvan</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label>Ad Soyad</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Departman</Label>
                  <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}><SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="grid gap-1.5"><Label>Uzmanlık</Label><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
              </div>
              <div className="grid gap-1.5"><Label>Özgeçmiş</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
              <div className="grid grid-cols-2 items-end gap-3">
                <div className="grid gap-1.5"><Label>Randevu süresi (dk)</Label><Input type="number" min={5} step={5} value={form.slot_minutes} onChange={(e) => setForm({ ...form, slot_minutes: Number(e.target.value) })} /></div>
                <label className="flex items-center gap-2 pb-2 text-sm"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /> Online randevuya açık</label>
              </div>
              <div className="grid gap-2">
                <Label>Çalışma saatleri</Label>
                {DAYS.map(([k, name]) => {
                  const r = form.working_hours[k];
                  return (
                    <div key={k} className="flex items-center gap-2 text-sm">
                      <Switch checked={!!r} onCheckedChange={(v) => {
                        const wh = { ...form.working_hours };
                        if (v) wh[k] = ["09:00", "17:00"]; else delete wh[k];
                        setForm({ ...form, working_hours: wh });
                      }} />
                      <span className="w-24">{name}</span>
                      {r && <>
                        <Input type="time" className="w-28" value={r[0]} onChange={(e) => setForm({ ...form, working_hours: { ...form.working_hours, [k]: [e.target.value, r[1]] } })} />
                        <span>–</span>
                        <Input type="time" className="w-28" value={r[1]} onChange={(e) => setForm({ ...form, working_hours: { ...form.working_hours, [k]: [r[0], e.target.value] } })} />
                      </>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={save}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!asstFor} onOpenChange={(o) => !o && setAsstFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Asistanlar — {asstDoctor?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {asstDoctor?.assistants?.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{a.full_name} <span className="text-muted-foreground">{a.phone}</span></span>
                <Button size="icon" variant="ghost" onClick={() => removeAsst(a.id)}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Input placeholder="Ad Soyad" value={asst.full_name} onChange={(e) => setAsst({ ...asst, full_name: e.target.value })} />
              <Input placeholder="Telefon" value={asst.phone} onChange={(e) => setAsst({ ...asst, phone: e.target.value })} />
              <Button onClick={addAsst}><UserPlus className="h-4 w-4" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
