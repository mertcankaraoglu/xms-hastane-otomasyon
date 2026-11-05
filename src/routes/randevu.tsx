import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { PublicHeader } from "@/components/PublicHeader";
import { supabase } from "@/integrations/supabase/client";
import { iconFor, fmtDateTime, fmtTime, HOSPITAL_NAME } from "@/lib/hospital";
import { generateSlots, istanbulYmd, dayBoundsUtc, type WorkingHours } from "@/lib/slots";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/randevu")({
  validateSearch: z.object({ department: z.string().optional() }),
  head: () => ({
    meta: [
      { title: `Online Randevu Al — ${HOSPITAL_NAME}` },
      { name: "description", content: "Bölüm, doktor ve saat seçerek birkaç adımda randevunuzu oluşturun." },
      { property: "og:title", content: `Online Randevu Al — ${HOSPITAL_NAME}` },
      { property: "og:description", content: "Bölüm, doktor ve saat seçerek birkaç adımda randevunuzu oluşturun." },
    ],
  }),
  component: BookingPage,
});

const patientSchema = z.object({
  full_name: z.string().trim().min(3, "Ad soyad girin").max(100),
  tc_no: z.string().trim().regex(/^\d{11}$/, "TC kimlik no 11 haneli olmalı"),
  phone: z.string().trim().regex(/^[0-9 +()-]{10,20}$/, "Geçerli bir telefon girin"),
  email: z.string().trim().email("Geçerli e-posta girin").max(255).or(z.literal("")),
  complaint: z.string().trim().max(500),
});

function BookingPage() {
  const search = Route.useSearch();
  const [deptId, setDeptId] = useState<string | undefined>(search.department);
  const [doctorId, setDoctorId] = useState<string>();
  const [date, setDate] = useState<Date>();
  const [slot, setSlot] = useState<string>();
  const [form, setForm] = useState({ full_name: "", tc_no: "", phone: "", email: "", complaint: "" });
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState<string>();

  const step = !deptId ? 1 : !doctorId ? 2 : !slot ? 3 : 4;

  const { data: depts } = useQuery({
    queryKey: ["public-departments-list"],
    queryFn: async () => (await supabase.from("departments").select("*").order("sort_order")).data ?? [],
  });
  const { data: doctors } = useQuery({
    queryKey: ["public-doctors", deptId],
    enabled: !!deptId,
    queryFn: async () => (await supabase.from("doctors").select("*").eq("department_id", deptId!).order("full_name")).data ?? [],
  });
  const { data: closed } = useQuery({
    queryKey: ["closed-days"],
    queryFn: async () => (await supabase.from("closed_days").select("day")).data?.map((d) => d.day) ?? [],
  });
  const doctor = doctors?.find((d) => d.id === doctorId);
  const dept = depts?.find((d) => d.id === deptId);
  const ymd = date ? istanbulYmd(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)) : undefined;

  const { data: booked, refetch: refetchBooked } = useQuery({
    queryKey: ["booked", doctorId, ymd],
    enabled: !!doctorId && !!ymd,
    queryFn: async () => {
      const [from, to] = dayBoundsUtc(ymd!);
      const { data } = await supabase.rpc("get_booked_slots", { _doctor_id: doctorId!, _from: from, _to: to });
      return (data ?? []).map((t: string) => new Date(t).toISOString());
    },
  });

  const slots = useMemo(() => {
    if (!doctor || !ymd) return [];
    return generateSlots(ymd, doctor.working_hours as WorkingHours, doctor.slot_minutes);
  }, [doctor, ymd]);

  async function submit() {
    const parsed = patientSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Hatalı bilgi"); return; }
    setSubmitting(true);
    const v = parsed.data;
    const { data, error } = await supabase.rpc("book_appointment", {
      _doctor_id: doctorId!, _starts_at: slot!, _full_name: v.full_name, _tc_no: v.tc_no,
      _phone: v.phone, _email: v.email, _complaint: v.complaint,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      setSlot(undefined);
      refetchBooked();
      return;
    }
    setCode(data as string);
  }

  if (code) {
    return (
      <div className="min-h-screen">
        <PublicHeader />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h1 className="mt-4 text-3xl font-bold">Randevunuz oluşturuldu</h1>
          <p className="mt-2 text-muted-foreground">{doctor?.title} {doctor?.full_name} · {dept?.name}</p>
          <p className="font-medium">{fmtDateTime(slot!)}</p>
          <div className="mt-8 rounded-xl border-2 border-dashed border-primary bg-primary-soft p-6">
            <p className="text-sm text-muted-foreground">Randevu kodunuz</p>
            <p className="font-display text-4xl font-bold tracking-widest text-primary">{code}</p>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Bu kod ve telefon numaranızla randevunuzu sorgulayabilir veya iptal edebilirsiniz.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild variant="outline"><Link to="/">Ana sayfa</Link></Button>
            <Button asChild><Link to="/randevu-sorgula">Randevumu Görüntüle</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  const back = () => {
    if (step === 4) setSlot(undefined);
    else if (step === 3) { setDoctorId(undefined); setDate(undefined); }
    else if (step === 2) setDeptId(undefined);
  };

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold">Online Randevu</h1>
        <ol className="mt-6 grid grid-cols-4 gap-2 text-xs font-medium">
          {["Bölüm", "Doktor", "Tarih & Saat", "Bilgileriniz"].map((s, i) => (
            <li key={s} className={cn("rounded-full border px-3 py-2 text-center", step > i + 1 && "border-primary/40 bg-primary-soft text-accent-foreground", step === i + 1 && "border-primary bg-primary text-primary-foreground", step < i + 1 && "text-muted-foreground")}>
              {i + 1}. {s}
            </li>
          ))}
        </ol>

        {(dept || doctor || slot) && (
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            {step > 1 && <Button variant="ghost" size="sm" onClick={back}><ChevronLeft className="h-4 w-4" /> Geri</Button>}
            {dept && <span className="rounded-full bg-secondary px-3 py-1">{dept.name}</span>}
            {doctor && <span className="rounded-full bg-secondary px-3 py-1">{doctor.title} {doctor.full_name}</span>}
            {slot && <span className="rounded-full bg-secondary px-3 py-1">{fmtDateTime(slot)}</span>}
          </div>
        )}

        <div className="mt-6">
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {depts?.map((d) => {
                const Icon = iconFor(d.icon);
                return (
                  <button key={d.id} onClick={() => setDeptId(d.id)} className="flex items-start gap-4 rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:shadow-soft">
                    <Icon className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                    <div><p className="font-semibold">{d.name}</p><p className="text-sm text-muted-foreground">{d.description}</p></div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {doctors?.map((d) => (
                <button key={d.id} onClick={() => setDoctorId(d.id)} className="flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:shadow-soft">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft font-display font-semibold text-accent-foreground">
                    {d.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div><p className="font-semibold">{d.title} {d.full_name}</p><p className="text-sm text-muted-foreground">{d.specialty}</p></div>
                </button>
              ))}
              {doctors?.length === 0 && <p className="text-muted-foreground">Bu bölümde aktif doktor yok.</p>}
            </div>
          )}

          {step === 3 && doctor && (
            <div className="grid gap-6 md:grid-cols-[auto_1fr]">
              <div className="rounded-xl border bg-card p-2">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => {
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    if (d < today) return true;
                    const max = new Date(); max.setDate(max.getDate() + 60);
                    if (d > max) return true;
                    const dow = d.getDay() === 0 ? 7 : d.getDay();
                    if (!(doctor.working_hours as WorkingHours)[String(dow)]) return true;
                    const y = istanbulYmd(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12));
                    return closed?.includes(y) ?? false;
                  }}
                />
              </div>
              <div>
                {!date ? (
                  <p className="text-muted-foreground">Lütfen takvimden bir gün seçin.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                    {slots.map((s) => {
                      const taken = booked?.includes(s) || new Date(s) < new Date();
                      return (
                        <Button key={s} variant="outline" disabled={taken} onClick={() => setSlot(s)} className={cn(taken && "line-through")}>
                          {fmtTime(s)}
                        </Button>
                      );
                    })}
                    {slots.length === 0 && <p className="col-span-full text-muted-foreground">Bu gün için uygun saat yok.</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid max-w-xl gap-4 rounded-xl border bg-card p-6">
              <Field label="Ad Soyad *"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="TC Kimlik No *"><Input inputMode="numeric" maxLength={11} value={form.tc_no} onChange={(e) => setForm({ ...form, tc_no: e.target.value })} /></Field>
                <Field label="Telefon *"><Input placeholder="05XX XXX XX XX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              </div>
              <Field label="E-posta"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Şikayetiniz"><Textarea value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} /></Field>
              <Button size="lg" onClick={submit} disabled={submitting}>{submitting ? "Kaydediliyor..." : "Randevuyu Onayla"}</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>;
}
