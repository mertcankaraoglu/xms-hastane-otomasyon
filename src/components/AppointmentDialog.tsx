import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { departmentsQuery, doctorsQuery, type ApptRow } from "@/lib/panel-data";
import { STATUSES, STATUS_LABEL, fmtTime, type Status } from "@/lib/hospital";
import { generateSlots, dayBoundsUtc, istanbulYmd, type WorkingHours } from "@/lib/slots";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; appt?: ApptRow | null; defaultDate?: string };

export function AppointmentDialog({ open, onOpenChange, appt, defaultDate }: Props) {
  const qc = useQueryClient();
  const { data: depts } = useQuery(departmentsQuery);
  const { data: doctors } = useQuery(doctorsQuery);
  const [deptId, setDeptId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [ymd, setYmd] = useState("");
  const [slot, setSlot] = useState("");
  const [status, setStatus] = useState<Status>("confirmed");
  const [complaint, setComplaint] = useState("");
  const [patientQ, setPatientQ] = useState("");
  const [patientId, setPatientId] = useState("");
  const [newP, setNewP] = useState({ full_name: "", tc_no: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (appt) {
      setDeptId(appt.doctors?.department_id ?? ""); setDoctorId(appt.doctor_id);
      setYmd(istanbulYmd(new Date(appt.starts_at))); setSlot(new Date(appt.starts_at).toISOString());
      setStatus(appt.status); setComplaint(appt.complaint ?? ""); setPatientId(appt.patient_id);
      setPatientQ(appt.patients?.full_name ?? "");
    } else {
      setDeptId(""); setDoctorId(""); setYmd(defaultDate ?? istanbulYmd(new Date())); setSlot("");
      setStatus("confirmed"); setComplaint(""); setPatientId(""); setPatientQ(""); setNewP({ full_name: "", tc_no: "", phone: "" });
    }
  }, [open, appt, defaultDate]);

  const doctor = doctors?.find((d) => d.id === doctorId);
  const { data: booked } = useQuery({
    queryKey: ["booked-panel", doctorId, ymd],
    enabled: !!doctorId && !!ymd && open,
    queryFn: async () => {
      const [f, t] = dayBoundsUtc(ymd);
      const { data } = await supabase.rpc("get_booked_slots", { _doctor_id: doctorId, _from: f, _to: t });
      return (data ?? []).map((x: string) => new Date(x).toISOString());
    },
  });
  const slots = useMemo(() => (doctor && ymd ? generateSlots(ymd, doctor.working_hours as WorkingHours, doctor.slot_minutes) : []), [doctor, ymd]);

  const { data: patientResults } = useQuery({
    queryKey: ["patient-search", patientQ],
    enabled: open && !appt && patientQ.length >= 2 && !patientId,
    queryFn: async () => (await supabase.from("patients").select("id, full_name, phone, tc_no")
      .or(`full_name.ilike.%${patientQ}%,phone.ilike.%${patientQ}%,tc_no.ilike.%${patientQ}%`).limit(6)).data ?? [],
  });

  async function save() {
    if (!doctor || !slot) return toast.error("Doktor ve saat seçin");
    setSaving(true);
    let pid = patientId;
    if (!pid) {
      if (newP.full_name.trim().length < 3 || newP.phone.trim().length < 10) { setSaving(false); return toast.error("Hasta seçin veya yeni hasta bilgilerini girin"); }
      const { data, error } = await supabase.from("patients").insert({ full_name: newP.full_name.trim(), tc_no: newP.tc_no.trim() || null, phone: newP.phone.trim() }).select("id").single();
      if (error) { setSaving(false); return toast.error(error.message); }
      pid = data.id;
    }
    const ends = new Date(new Date(slot).getTime() + doctor.slot_minutes * 60000).toISOString();
    const payload = { patient_id: pid, doctor_id: doctor.id, starts_at: slot, ends_at: ends, status, complaint: complaint || null };
    const { error } = appt
      ? await supabase.from("appointments").update(payload).eq("id", appt.id)
      : await supabase.from("appointments").insert({ ...payload, source: "panel" });
    setSaving(false);
    if (error) return toast.error(error.code === "23505" ? "Bu saat dolu" : error.message);
    toast.success(appt ? "Randevu güncellendi" : "Randevu oluşturuldu");
    qc.invalidateQueries({ queryKey: ["appointments"] });
    qc.invalidateQueries({ queryKey: ["patient"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{appt ? `Randevu ${appt.code}` : "Yeni Randevu"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Hasta</Label>
            {appt ? <Input value={patientQ} disabled /> : (
              <>
                <Input placeholder="Ad, telefon veya TC ile ara" value={patientQ} onChange={(e) => { setPatientQ(e.target.value); setPatientId(""); }} />
                {patientResults && patientResults.length > 0 && !patientId && (
                  <div className="rounded-md border">
                    {patientResults.map((p) => (
                      <button key={p.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setPatientId(p.id); setPatientQ(p.full_name); }}>
                        {p.full_name} <span className="text-muted-foreground">· {p.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!patientId && (
                  <div className="grid gap-2 rounded-md bg-muted/50 p-3 sm:grid-cols-3">
                    <p className="text-xs text-muted-foreground sm:col-span-3">veya yeni hasta:</p>
                    <Input placeholder="Ad Soyad" value={newP.full_name} onChange={(e) => setNewP({ ...newP, full_name: e.target.value })} />
                    <Input placeholder="TC No" value={newP.tc_no} onChange={(e) => setNewP({ ...newP, tc_no: e.target.value })} />
                    <Input placeholder="Telefon" value={newP.phone} onChange={(e) => setNewP({ ...newP, phone: e.target.value })} />
                  </div>
                )}
              </>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label>Departman</Label>
              <Select value={deptId} onValueChange={(v) => { setDeptId(v); setDoctorId(""); setSlot(""); }}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>{depts?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Doktor</Label>
              <Select value={doctorId} onValueChange={(v) => { setDoctorId(v); setSlot(""); }}>
                <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>{doctors?.filter((d) => d.department_id === deptId).map((d) => <SelectItem key={d.id} value={d.id}>{d.title} {d.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label>Tarih</Label><Input type="date" value={ymd} onChange={(e) => { setYmd(e.target.value); setSlot(""); }} /></div>
            <div className="grid gap-1.5"><Label>Durum</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {doctor && (
            <div className="grid gap-1.5"><Label>Saat</Label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {slots.map((s) => {
                  const taken = booked?.includes(s) && s !== (appt && new Date(appt.starts_at).toISOString());
                  return <Button key={s} size="sm" type="button" variant={slot === s ? "default" : "outline"} disabled={taken} onClick={() => setSlot(s)}>{fmtTime(s)}</Button>;
                })}
                {slots.length === 0 && <p className="col-span-full text-sm text-muted-foreground">Doktor bu gün çalışmıyor.</p>}
              </div>
            </div>
          )}
          <div className="grid gap-1.5"><Label>Şikayet / Not</Label><Textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
