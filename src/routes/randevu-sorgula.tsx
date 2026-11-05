import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicHeader } from "@/components/PublicHeader";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime, STATUS_LABEL, STATUS_CLASS, HOSPITAL_NAME, type Status } from "@/lib/hospital";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/randevu-sorgula")({
  head: () => ({
    meta: [
      { title: `Randevu Sorgula — ${HOSPITAL_NAME}` },
      { name: "description", content: "Randevu kodunuz ve telefonunuzla randevunuzu görüntüleyin veya iptal edin." },
      { property: "og:title", content: `Randevu Sorgula — ${HOSPITAL_NAME}` },
      { property: "og:description", content: "Randevu kodunuz ve telefonunuzla randevunuzu görüntüleyin veya iptal edin." },
    ],
  }),
  component: LookupPage,
});

type Result = { code: string; starts_at: string; status: Status; doctor_name: string; department_name: string; patient_name: string };

function LookupPage() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [res, setRes] = useState<Result | null>();
  const [loading, setLoading] = useState(false);

  async function lookup() {
    if (code.trim().length < 6 || phone.trim().length < 10) { toast.error("Kod ve telefon girin"); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc("lookup_appointment", { _code: code.trim(), _phone: phone.trim() });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRes((data?.[0] as Result) ?? null);
  }
  async function cancel() {
    const { data, error } = await supabase.rpc("cancel_appointment_public", { _code: code.trim(), _phone: phone.trim() });
    if (error || !data) { toast.error("Randevu iptal edilemedi"); return; }
    toast.success("Randevunuz iptal edildi");
    lookup();
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-3xl font-bold">Randevu Sorgula</h1>
        <div className="mt-6 grid gap-4 rounded-xl border bg-card p-6">
          <div className="grid gap-1.5"><Label>Randevu Kodu</Label><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} /></div>
          <div className="grid gap-1.5"><Label>Telefon</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <Button onClick={lookup} disabled={loading}>Sorgula</Button>
        </div>
        {res === null && <p className="mt-6 text-center text-muted-foreground">Randevu bulunamadı.</p>}
        {res && (
          <div className="mt-6 rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between">
              <span className="font-display text-xl font-bold tracking-widest">{res.code}</span>
              <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_CLASS[res.status])}>{STATUS_LABEL[res.status]}</span>
            </div>
            <dl className="mt-4 grid gap-2 text-sm">
              <div><dt className="text-muted-foreground">Hasta</dt><dd className="font-medium">{res.patient_name}</dd></div>
              <div><dt className="text-muted-foreground">Doktor</dt><dd className="font-medium">{res.doctor_name} · {res.department_name}</dd></div>
              <div><dt className="text-muted-foreground">Tarih</dt><dd className="font-medium">{fmtDateTime(res.starts_at)}</dd></div>
            </dl>
            {(res.status === "pending" || res.status === "confirmed") && new Date(res.starts_at) > new Date() && (
              <Button variant="destructive" className="mt-6 w-full" onClick={cancel}>Randevuyu İptal Et</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
