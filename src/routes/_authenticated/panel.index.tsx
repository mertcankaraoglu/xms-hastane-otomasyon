import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarCheck, CalendarX, Globe, UserX } from "lucide-react";
import { apptsInRange, departmentsQuery, doctorsQuery } from "@/lib/panel-data";
import { dayBoundsUtc, istanbulYmd } from "@/lib/slots";
import { fmtTime } from "@/lib/hospital";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/panel/")({
  head: () => ({ meta: [{ title: "Dashboard — Yönetim Paneli" }, { name: "description", content: "Randevu istatistikleri" }, { property: "og:title", content: "Dashboard" }, { property: "og:description", content: "Randevu istatistikleri" }] }),
  component: Dashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Dashboard() {
  const today = istanbulYmd(new Date());
  const from = dayBoundsUtc(istanbulYmd(new Date(Date.now() - 29 * 86400000)))[0];
  const to = dayBoundsUtc(istanbulYmd(new Date(Date.now() + 7 * 86400000)))[1];
  const { data: appts = [] } = useQuery(apptsInRange(from, to));
  const { data: depts = [] } = useQuery(departmentsQuery);
  const { data: doctors = [] } = useQuery(doctorsQuery);

  const s = useMemo(() => {
    const todayList = appts.filter((a) => istanbulYmd(new Date(a.starts_at)) === today);
    const past = appts.filter((a) => new Date(a.starts_at) < new Date());
    const daily: { day: string; adet: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const y = istanbulYmd(new Date(Date.now() - i * 86400000));
      daily.push({ day: y.slice(5).split("-").reverse().join("."), adet: appts.filter((a) => istanbulYmd(new Date(a.starts_at)) === y && a.status !== "cancelled").length });
    }
    const byDept = depts.map((d) => ({ name: d.name, value: appts.filter((a) => a.doctors?.department_id === d.id && a.status !== "cancelled").length })).filter((x) => x.value > 0);
    const byDoctor = doctors.map((d) => ({ name: `${d.full_name}`, adet: appts.filter((a) => a.doctor_id === d.id && a.status !== "cancelled").length }))
      .sort((a, b) => b.adet - a.adet).slice(0, 8);
    const pct = (n: number) => (past.length ? Math.round((n / past.length) * 100) : 0);
    return {
      todayList,
      upcoming: appts.filter((a) => new Date(a.starts_at) >= new Date() && a.status !== "cancelled").length,
      cancelRate: pct(past.filter((a) => a.status === "cancelled").length),
      noShowRate: pct(past.filter((a) => a.status === "no_show").length),
      onlineRate: appts.length ? Math.round((appts.filter((a) => a.source === "online").length / appts.length) * 100) : 0,
      daily, byDept, byDoctor,
    };
  }, [appts, depts, doctors, today]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={CalendarCheck} label="Bugünkü randevu" value={s.todayList.length} sub={`${s.upcoming} yaklaşan`} />
        <Kpi icon={CalendarX} label="İptal oranı (30g)" value={`%${s.cancelRate}`} />
        <Kpi icon={UserX} label="Gelmeme oranı (30g)" value={`%${s.noShowRate}`} />
        <Kpi icon={Globe} label="Online randevu payı" value={`%${s.onlineRate}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Son 14 gün" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={s.daily}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="day" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="adet" fill="var(--chart-1)" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Departman dağılımı">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart><Pie data={s.byDept} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>{s.byDept.map((_, i) => <Cell key={i} fill={COLORS[i % 5]} />)}</Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Doktor doluluğu (en yoğun 8)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={s.byDoctor} layout="vertical"><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="name" width={110} fontSize={11} /><Tooltip /><Bar dataKey="adet" fill="var(--chart-2)" radius={[0, 4, 4, 0]} /></BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Bugünün randevuları">
          <div className="max-h-[260px] divide-y overflow-y-auto">
            {s.todayList.map((a) => (
              <Link key={a.id} to="/panel/hastalar/$id" params={{ id: a.patient_id }} className="flex items-center justify-between gap-2 py-2 text-sm hover:bg-muted/50">
                <span className="w-12 font-mono">{fmtTime(a.starts_at)}</span>
                <span className="flex-1 truncate">{a.patients?.full_name} <span className="text-muted-foreground">· {a.doctors?.full_name}</span></span>
                <StatusBadge status={a.status} />
              </Link>
            ))}
            {s.todayList.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Bugün randevu yok.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">{label}<Icon className="h-4 w-4 text-primary" /></div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border bg-card p-5 ${className ?? ""}`}><h2 className="mb-3 font-semibold">{title}</h2>{children}</div>;
}
