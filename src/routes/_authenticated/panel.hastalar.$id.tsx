import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { APPT_SELECT, type ApptRow } from "@/lib/panel-data";
import { fmtDate, fmtDateTime } from "@/lib/hospital";
import { StatusBadge } from "@/components/StatusBadge";
import { AppointmentDialog } from "@/components/AppointmentDialog";

export const Route = createFileRoute("/_authenticated/panel/hastalar/$id")({
  head: () => ({ meta: [{ title: "Hasta Detayı — Yönetim Paneli" }, { name: "description", content: "Hasta geçmişi" }, { property: "og:title", content: "Hasta Detayı" }, { property: "og:description", content: "Hasta geçmişi" }] }),
  component: PatientDetail,
});

function PatientDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; appt?: ApptRow | null }>({ open: false });
  const [note, setNote] = useState({ appointment_id: "none", diagnosis: "", notes: "" });

  const { data } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const [p, a, n] = await Promise.all([
        supabase.from("patients").select("*").eq("id", id).single(),
        supabase.from("appointments").select(APPT_SELECT).eq("patient_id", id).order("starts_at", { ascending: false }),
        supabase.from("visit_notes").select("*, doctors(full_name, title)").eq("patient_id", id).order("created_at", { ascending: false }),
      ]);
      if (p.error) throw p.error;
      return { patient: p.data, appts: (a.data ?? []) as unknown as ApptRow[], notes: n.data ?? [] };
    },
  });
  const [edit, setEdit] = useState<Record<string, string> | null>(null);

  if (!data) return <p className="text-muted-foreground">Yükleniyor...</p>;
  const { patient, appts, notes } = data;

  async function addNote() {
    if (note.notes.trim().length < 2) return toast.error("Not girin");
    const appt = appts.find((a) => a.id === note.appointment_id);
    const { error } = await supabase.from("visit_notes").insert({
      patient_id: id, appointment_id: appt?.id ?? null, doctor_id: appt?.doctor_id ?? null,
      diagnosis: note.diagnosis.trim() || null, notes: note.notes.trim(),
    });
    if (error) return toast.error(error.message);
    setNote({ appointment_id: "none", diagnosis: "", notes: "" });
    qc.invalidateQueries({ queryKey: ["patient", id] });
  }
  async function savePatient() {
    if (!edit) return;
    const { error } = await supabase.from("patients").update({
      full_name: edit.full_name, phone: edit.phone, tc_no: edit.tc_no || null, email: edit.email || null, notes: edit.notes || null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    setEdit(null); toast.success("Kaydedildi");
    qc.invalidateQueries({ queryKey: ["patient", id] });
  }

  return (
    <div className="space-y-6">
      <Link to="/panel/hastalar" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> Hastalar</Link>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="h-fit rounded-xl border bg-card p-5">
          {edit ? (
            <div className="grid gap-3">
              {(["full_name", "tc_no", "phone", "email"] as const).map((k) => (
                <div key={k} className="grid gap-1"><Label className="text-xs">{({ full_name: "Ad Soyad", tc_no: "TC", phone: "Telefon", email: "E-posta" })[k]}</Label><Input value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>
              ))}
              <div className="grid gap-1"><Label className="text-xs">Notlar</Label><Textarea value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
              <div className="flex gap-2"><Button onClick={savePatient}>Kaydet</Button><Button variant="ghost" onClick={() => setEdit(null)}>Vazgeç</Button></div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold">{patient.full_name}</h1>
              <dl className="mt-4 grid gap-2 text-sm">
                <Row k="TC" v={patient.tc_no} /><Row k="Telefon" v={patient.phone} /><Row k="E-posta" v={patient.email} />
                <Row k="Doğum" v={patient.birth_date ? fmtDate(patient.birth_date) : null} /><Row k="Kayıt" v={fmtDate(patient.created_at)} />
                {patient.notes && <Row k="Not" v={patient.notes} />}
              </dl>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEdit({ full_name: patient.full_name, tc_no: patient.tc_no ?? "", phone: patient.phone, email: patient.email ?? "", notes: patient.notes ?? "" })}>Düzenle</Button>
                <Button size="sm" onClick={() => setDialog({ open: true })}><Plus className="h-4 w-4" /> Randevu</Button>
              </div>
            </>
          )}
        </div>
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 font-semibold">Randevu geçmişi ({appts.length})</h2>
            <div className="divide-y">
              {appts.map((a) => (
                <button key={a.id} onClick={() => setDialog({ open: true, appt: a })} className="flex w-full flex-wrap items-center gap-3 py-2.5 text-left text-sm hover:bg-muted/50">
                  <span className="w-40 whitespace-nowrap">{fmtDateTime(a.starts_at)}</span>
                  <span className="flex-1">{a.doctors?.title} {a.doctors?.full_name} <span className="text-muted-foreground">· {a.doctors?.departments?.name}</span>{a.complaint && <span className="block text-xs text-muted-foreground">{a.complaint}</span>}</span>
                  <StatusBadge status={a.status} />
                </button>
              ))}
              {appts.length === 0 && <p className="py-4 text-sm text-muted-foreground">Randevu yok.</p>}
            </div>
          </section>
          <section className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 font-semibold">Görüşme notları</h2>
            <div className="mb-4 grid gap-2 rounded-lg bg-muted/50 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={note.appointment_id} onValueChange={(v) => setNote({ ...note, appointment_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Randevuya bağlama</SelectItem>{appts.map((a) => <SelectItem key={a.id} value={a.id}>{fmtDateTime(a.starts_at)} · {a.doctors?.full_name}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Tanı" value={note.diagnosis} onChange={(e) => setNote({ ...note, diagnosis: e.target.value })} />
              </div>
              <Textarea placeholder="Görüşme notu" value={note.notes} onChange={(e) => setNote({ ...note, notes: e.target.value })} />
              <Button size="sm" className="justify-self-end" onClick={addNote}>Not ekle</Button>
            </div>
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="rounded-lg border-l-4 border-primary bg-background p-3 text-sm">
                  <div className="flex justify-between text-xs text-muted-foreground"><span>{n.doctors ? `${n.doctors.title} ${n.doctors.full_name}` : "—"}</span><span>{fmtDateTime(n.created_at)}</span></div>
                  {n.diagnosis && <p className="mt-1 font-medium">{n.diagnosis}</p>}
                  <p className="mt-1 whitespace-pre-wrap">{n.notes}</p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-sm text-muted-foreground">Henüz not yok.</p>}
            </div>
          </section>
        </div>
      </div>
      <AppointmentDialog open={dialog.open} onOpenChange={(o) => { setDialog({ ...dialog, open: o }); if (!o) qc.invalidateQueries({ queryKey: ["patient", id] }); }} appt={dialog.appt} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v || "—"}</dd></div>;
}
