import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apptsInRange, departmentsQuery, type ApptRow } from "@/lib/panel-data";
import { dayBoundsUtc, istanbulYmd } from "@/lib/slots";
import { fmtDateTime, STATUSES, STATUS_LABEL, type Status } from "@/lib/hospital";
import { supabase } from "@/integrations/supabase/client";
import { AppointmentDialog } from "@/components/AppointmentDialog";

export const Route = createFileRoute("/_authenticated/panel/randevular")({
  head: () => ({ meta: [{ title: "Randevular — Yönetim Paneli" }, { name: "description", content: "Randevu listesi" }, { property: "og:title", content: "Randevular" }, { property: "og:description", content: "Randevu listesi" }] }),
  component: ListPage,
});

function ListPage() {
  const qc = useQueryClient();
  const [from, setFrom] = useState(istanbulYmd(new Date(Date.now() - 7 * 86400000)));
  const [to, setTo] = useState(istanbulYmd(new Date(Date.now() + 14 * 86400000)));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [dept, setDept] = useState("all");
  const [dialog, setDialog] = useState<{ open: boolean; appt?: ApptRow | null }>({ open: false });
  const { data: appts = [] } = useQuery(apptsInRange(dayBoundsUtc(from)[0], dayBoundsUtc(to)[1]));
  const { data: depts = [] } = useQuery(departmentsQuery);

  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return appts.filter((a) => (status === "all" || a.status === status) && (dept === "all" || a.doctors?.department_id === dept) &&
      (!s || a.code.toLowerCase().includes(s) || a.patients?.full_name.toLowerCase().includes(s) || a.patients?.phone.includes(s) || a.doctors?.full_name.toLowerCase().includes(s)))
      .sort((x, y) => y.created_at.localeCompare(x.created_at));
  }, [appts, q, status, dept]);

  async function setRowStatus(id: string, st: Status) {
    const { error } = await supabase.from("appointments").update({ status: st }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["appointments"] });
  }

  function exportCsv() {
    const head = ["Kod", "Tarih", "Hasta", "Telefon", "Doktor", "Departman", "Durum", "Kaynak", "Şikayet"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((a) => [a.code, fmtDateTime(a.starts_at), a.patients?.full_name, a.patients?.phone, a.doctors?.full_name, a.doctors?.departments?.name, STATUS_LABEL[a.status], a.source, a.complaint].map(esc).join(";"));
    const blob = new Blob(["\ufeff" + [head.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a"); el.href = url; el.download = `randevular-${from}_${to}.csv`; el.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Randevular</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</Button>
          <Button onClick={() => setDialog({ open: true })}><Plus className="h-4 w-4" /> Yeni</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input className="w-64" placeholder="Kod, hasta, telefon, doktor..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tüm durumlar</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent></Select>
        <Select value={dept} onValueChange={setDept}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tüm departmanlar</SelectItem>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Kod</TableHead><TableHead>Randevu</TableHead><TableHead>Alınma</TableHead><TableHead>Hasta</TableHead><TableHead>Doktor</TableHead><TableHead>Kaynak</TableHead><TableHead>Durum</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs">{a.code}</TableCell>
                <TableCell className="whitespace-nowrap">{fmtDateTime(a.starts_at)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(a.created_at)}</TableCell>
                <TableCell><Link to="/panel/hastalar/$id" params={{ id: a.patient_id }} className="font-medium hover:text-primary">{a.patients?.full_name}</Link><div className="text-xs text-muted-foreground">{a.patients?.phone}</div></TableCell>
                <TableCell>{a.doctors?.full_name}<div className="text-xs text-muted-foreground">{a.doctors?.departments?.name}</div></TableCell>
                <TableCell className="text-xs">{a.source === "online" ? "Online" : "Panel"}</TableCell>
                <TableCell>
                  <Select value={a.status} onValueChange={(v) => setRowStatus(a.id, v as Status)}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => setDialog({ open: true, appt: a })}>Düzenle</Button></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Kayıt yok</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{rows.length} kayıt</p>
      <AppointmentDialog open={dialog.open} onOpenChange={(o) => setDialog({ ...dialog, open: o })} appt={dialog.appt} />
    </div>
  );
}
