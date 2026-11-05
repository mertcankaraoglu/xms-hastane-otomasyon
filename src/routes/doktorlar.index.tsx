import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter, initials } from "@/components/PublicFooter";
import { listDepartmentsPublic, listDoctorsPublic } from "@/lib/public-content.functions";
import { HOSPITAL_NAME } from "@/lib/hospital";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/doktorlar/")({
  validateSearch: z.object({ bolum: z.string().optional(), q: z.string().optional() }),
  loader: async () => {
    const [doctors, depts] = await Promise.all([listDoctorsPublic(), listDepartmentsPublic()]);
    return { doctors, depts };
  },
  head: () => ({
    meta: [
      { title: `Doktorlarımız — ${HOSPITAL_NAME}` },
      { name: "description", content: "Uzman doktor kadromuzu tanıyın; özgeçmiş, eğitim ve uzmanlık alanlarını inceleyin." },
      { property: "og:title", content: `Doktorlarımız — ${HOSPITAL_NAME}` },
      { property: "og:description", content: "Uzman doktor kadromuz ve uzmanlık alanları." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => <div className="p-10 text-center">{error instanceof Error ? error.message : "Bir hata oluştu"}</div>,
  notFoundComponent: () => <div className="p-10 text-center">Bulunamadı.</div>,
  component: DoctorList,
});

function DoctorList() {
  const { doctors, depts } = Route.useLoaderData();
  const { bolum, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/doktorlar/" });
  const term = (q ?? "").toLocaleLowerCase("tr");
  const list = doctors.filter((d) => (!bolum || d.departments?.slug === bolum) && (!term || `${d.title ?? ""} ${d.full_name} ${d.specialty ?? ""} ${d.departments?.name ?? ""}`.toLocaleLowerCase("tr").includes(term)));

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <section className="bg-hero">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-5xl">Uzman kadromuzla tanışın.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">{doctors.length} doktorumuzun özgeçmişini, eğitimini ve uzmanlık alanlarını inceleyin.</p>
          <div className="relative mt-8 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-12 bg-card pl-10" placeholder="Doktor adı, bölüm veya uzmanlık ara" value={q ?? ""}
              onChange={(e) => navigate({ search: (p) => ({ ...p, q: e.target.value || undefined }), replace: true })} />
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap gap-2">
          <Chip active={!bolum} onClick={() => navigate({ search: (p) => ({ ...p, bolum: undefined }) })}>Tümü</Chip>
          {depts.map((d) => <Chip key={d.id} active={bolum === d.slug} onClick={() => navigate({ search: (p) => ({ ...p, bolum: d.slug ?? undefined }) })}>{d.name}</Chip>)}
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d) => (
            <Link key={d.id} to="/doktorlar/$slug" params={{ slug: d.slug ?? "" }} className="group overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-1 hover:border-primary hover:shadow-soft">
              <div className="grid aspect-[4/3] place-items-center bg-primary-soft">
                {d.photo_url ? <img src={d.photo_url} alt={d.full_name} className="h-full w-full object-cover" />
                  : <span className="font-display text-5xl font-semibold text-primary">{initials(d.full_name)}</span>}
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{d.departments?.name}</p>
                <p className="mt-1 text-lg font-semibold">{d.title} {d.full_name}</p>
                <p className="text-sm text-muted-foreground">{d.specialty}</p>
              </div>
            </Link>
          ))}
        </div>
        {list.length === 0 && <p className="mt-10 text-center text-muted-foreground">Aramanıza uygun doktor bulunamadı.</p>}
      </div>
      <PublicFooter />
    </div>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className={cn("rounded-full border px-4 py-1.5 text-sm transition", active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary")}>{children}</button>;
}
