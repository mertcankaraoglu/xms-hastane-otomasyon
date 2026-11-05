import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Award, BriefcaseMedical, CalendarCheck, Clock, GraduationCap, Languages, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter, initials } from "@/components/PublicFooter";
import { getDoctorBySlug, type TimelineItem } from "@/lib/public-content.functions";
import { HOSPITAL_NAME } from "@/lib/hospital";

const DAYS: [string, string][] = [["1", "Pazartesi"], ["2", "Salı"], ["3", "Çarşamba"], ["4", "Perşembe"], ["5", "Cuma"], ["6", "Cumartesi"], ["7", "Pazar"]];

export const Route = createFileRoute("/doktorlar/$slug")({
  loader: async ({ params }) => {
    const r = await getDoctorBySlug({ data: params.slug });
    if (!r) throw notFound();
    return r;
  },
  head: ({ loaderData: d }) => {
    const title = d ? `${d.title} ${d.full_name} — ${HOSPITAL_NAME}` : `Doktor — ${HOSPITAL_NAME}`;
    const desc = d ? `${d.departments?.name ?? ""} · ${d.specialty ?? ""}. Özgeçmiş, eğitim ve online randevu.` : "Doktor profili";
    const img = d?.photo_url?.startsWith("https://") ? d.photo_url : null;
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        { property: "og:type", content: "profile" }, { name: "twitter:card", content: "summary_large_image" },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
    };
  },
  errorComponent: ({ error }) => <div className="p-10 text-center">{error instanceof Error ? error.message : "Bir hata oluştu"}</div>,
  notFoundComponent: () => (
    <div className="min-h-screen"><PublicHeader /><div className="p-16 text-center"><h1 className="text-2xl font-bold">Doktor bulunamadı</h1><Button asChild className="mt-4"><Link to="/doktorlar">Tüm doktorlar</Link></Button></div></div>
  ),
  component: DoctorPage,
});

function DoctorPage() {
  const d = Route.useLoaderData();
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <section className="bg-hero">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <Link to="/doktorlar" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Tüm doktorlar</Link>
          <div className="mt-6 flex flex-col gap-8 md:flex-row md:items-center">
            {d.photo_url ? <img src={d.photo_url} alt={d.full_name} className="h-44 w-44 rounded-3xl object-cover shadow-soft" />
              : <span className="grid h-44 w-44 place-items-center rounded-3xl bg-primary font-display text-5xl font-semibold text-primary-foreground shadow-soft">{initials(d.full_name)}</span>}
            <div className="flex-1">
              {d.departments && <Link to="/bolumler/$slug" params={{ slug: d.departments.slug ?? "" }} className="text-sm font-semibold uppercase tracking-wide text-primary hover:underline">{d.departments.name}</Link>}
              <h1 className="mt-2 text-4xl font-bold leading-tight md:text-5xl">{d.title} {d.full_name}</h1>
              <p className="mt-2 text-lg text-muted-foreground">{d.specialty}</p>
              <Button asChild size="lg" className="mt-6"><Link to="/randevu" search={{ department: d.department_id, doctor: d.id }}><CalendarCheck className="h-4 w-4" /> Randevu al</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 lg:grid-cols-[1fr_320px]">
        <div className="space-y-12">
          {d.bio && <section><h2 className="text-2xl font-bold">Hakkında</h2><p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">{d.bio}</p></section>}
          <Timeline icon={GraduationCap} title="Eğitim" items={d.education} />
          <Timeline icon={BriefcaseMedical} title="Kariyer" items={d.experience} />
        </div>
        <aside className="space-y-5">
          <TagCard icon={Sparkles} title="İlgi alanları" tags={d.interests} />
          <TagCard icon={Languages} title="Diller" tags={d.languages} />
          <TagCard icon={Award} title="Sertifika ve üyelikler" tags={d.certifications} list />
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4 text-primary" /> Çalışma saatleri</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {DAYS.map(([k, n]) => { const r = d.working_hours?.[k]; return <li key={k} className="flex justify-between"><span>{n}</span><span className={r ? "" : "text-muted-foreground"}>{r ? `${r[0]} – ${r[1]}` : "Kapalı"}</span></li>; })}
            </ul>
          </div>
        </aside>
      </div>
      <PublicFooter />
    </div>
  );
}

function Timeline({ icon: Icon, title, items }: { icon: typeof GraduationCap; title: string; items: TimelineItem[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="flex items-center gap-2 text-2xl font-bold"><Icon className="h-6 w-6 text-primary" /> {title}</h2>
      <ol className="mt-6 space-y-6 border-l-2 border-primary-soft pl-6">
        {items.map((it, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
            <p className="text-sm font-semibold text-primary">{it.year_from}{it.year_to ? ` – ${it.year_to}` : ""}</p>
            <p className="mt-1 font-semibold">{it.title}</p>
            <p className="text-sm text-muted-foreground">{it.institution}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function TagCard({ icon: Icon, title, tags, list }: { icon: typeof Award; title: string; tags: string[]; list?: boolean }) {
  if (!tags.length) return null;
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-primary" /> {title}</h3>
      {list ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{tags.map((t) => <li key={t}>{t}</li>)}</ul>
        : <div className="mt-3 flex flex-wrap gap-2">{tags.map((t) => <span key={t} className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-accent-foreground">{t}</span>)}</div>}
    </div>
  );
}
