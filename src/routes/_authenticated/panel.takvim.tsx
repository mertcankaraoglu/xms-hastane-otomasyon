import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apptsInRange, departmentsQuery, doctorsQuery, type ApptRow } from "@/lib/panel-data";
import { dayBoundsUtc, istanbulYmd } from "@/lib/slots";
import { fmtTime, STATUS_CLASS } from "@/lib/hospital";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/panel/takvim")({
  head: () => ({ meta: [{ title: "Takvim — Yönetim Paneli" }, { name: "description", content: "Randevu takvimi" }, { property: "og:title", content: "Takvim" }, { property: "og:description", content: "Randevu takvimi" }] }),
  component: CalendarPage,
});

const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function mondayOf(ymd: string) {
  const d = new Date(ymd + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
const addDays = (ymd: string, n: number) => { const d = new Date(ymd + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function CalendarPage() {
  const [view, setView] = useState<"day" | "week">("week");
  const [anchor, setAnchor] = useState(istanbulYmd(new Date()));
  const [deptId, setDeptId] = useState("all");
  const [doctorId, setDoctorId] = useState("all");
  const [dialog, setDialog] = useState<{ open: boolean; appt?: ApptRow | null; date?: string }>({ open: false });

  const days = view === "day" ? [anchor] : Array.from({ length: 7 }, (_, i) => addDays(mondayOf(anchor), i));
  const from = dayBoundsUtc(days[0])[0];
  const to = dayBoundsUtc(days[days.length - 1])[1];
  const { data: appts = [] } = useQuery(apptsInRange(from, to));
  const { data: depts = [] } = useQuery(departmentsQuery);
  const { data: doctors = [] } = useQuery(doctorsQuery);

  const filtered = useMemo(() => appts.filter((a) =>
    (deptId === "all" || a.doctors?.department_id === deptId) && (doctorId === "all" || a.doctor_id === doctorId)), [appts, deptId, doctorId]);

  const step = view === "day" ? 1 : 7;
  const label = view === "day"
    ? new Date(anchor + "T12:00:00Z").toLocaleDateString("tr-TR", { dateStyle: "full" })
    : `${new Date(days[0] + "T12:00:00Z").toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} – ${new Date(days[6] + "T12:00:00Z").toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Takvim</h1>
        <Button onClick={() => setDialog({ open: true, date: anchor })}><Plus className="h-4 w-4" /> Yeni Randevu</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setAnchor(addDays(anchor, -step))}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" onClick={() => setAnchor(istanbulYmd(new Date()))}>Bugün</Button>
        <Button variant="outline" size="icon" onClick={() => setAnchor(addDays(anchor, step))}><ChevronRight className="h-4 w-4" /></Button>
        <span className="px-2 font-medium">{label}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Select value={view} onValueChange={(v) => setView(v as "day" | "week")}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="day">Gün</SelectItem><SelectItem value="week">Hafta</SelectItem></SelectContent></Select>
          <Select value={deptId} onValueChange={(v) => { setDeptId(v); setDoctorId("all"); }}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tüm departmanlar</SelectItem>{depts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
          <Select value={doctorId} onValueChange={setDoctorId}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tüm doktorlar</SelectItem>{doctors.filter((d) => deptId === "all" || d.department_id === deptId).map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      <div className={cn("grid gap-2", view === "week" ? "grid-cols-1 md:grid-cols-7" : "grid-cols-1")}>
        {days.map((d, i) => {
          const list = filtered.filter((a) => istanbulYmd(new Date(a.starts_at)) === d);
          const isToday = d === istanbulYmd(new Date());
          return (
            <div key={d} className={cn("min-h-64 rounded-xl border bg-card p-2", isToday && "border-primary")}>
              <button onClick={() => setDialog({ open: true, date: d })} className="mb-2 flex w-full items-center justify-between rounded-md px-1 text-sm hover:bg-muted">
                <span className="font-semibold">{view === "week" ? DAY_NAMES[i] : ""} {d.slice(8)}.{d.slice(5, 7)}</span>
                <span className="text-xs text-muted-foreground">{list.length}</span>
              </button>
              <div className="space-y-1.5">
                {list.map((a) => (
                  <button key={a.id} onClick={() => setDialog({ open: true, appt: a })} className={cn("block w-full rounded-md border px-2 py-1.5 text-left text-xs transition hover:shadow-soft", STATUS_CLASS[a.status])}>
                    <span className="font-mono font-semibold">{fmtTime(a.starts_at)}</span> {a.patients?.full_name}
                    <span className="block truncate opacity-80">{a.doctors?.full_name}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <AppointmentDialog open={dialog.open} onOpenChange={(o) => setDialog({ ...dialog, open: o })} appt={dialog.appt} defaultDate={dialog.date} />
    </div>
  );
}
