import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CalendarCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter, initials } from "@/components/PublicFooter";
import { getDepartmentBySlug } from "@/lib/public-content.functions";
import { HOSPITAL_NAME, iconFor } from "@/lib/hospital";

export const Route = createFileRoute("/bolumler/$slug")({
  loader: async ({ params }) => {
    const r = await getDepartmentBySlug({ data: params.slug });
    if (!r) throw notFound();
    return r;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.dept.name} — ${HOSPITAL_NAME}` : `Bölüm — ${HOSPITAL_NAME}`;
    const desc = loaderData?.dept.short_description ?? "Bölüm bilgileri, hizmetler ve doktorlar.";
    const img = loaderData?.dept.cover_url?.startsWith("https://") ? loaderData.dept.cover_url : null;
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
    };
  },
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
  notFoundComponent: () => (
    <div className="min-h-screen"><PublicHeader /><div className="p-16 text-center"><h1 className="text-2xl font-bold">Bölüm bulunamadı</h1><Button asChild className="mt-4"><Link to="/bolumler">Tüm bölümler</Link></Button></div></div>
  ),
  component: DeptPage,
});

function DeptPage() {
  const { dept, faqs, doctors } = Route.useLoaderData();
  const Icon = iconFor(dept.icon);
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <section className="relative overflow-hidden bg-hero">
        {dept.cover_url && <img src={dept.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />}
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-20">
          <Link to="/bolumler" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Tüm bölümler</Link>
          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft"><Icon className="h-7 w-7" /></span>
              <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl">{dept.name}</h1>
              <p className="mt-4 text-lg text-muted-foreground">{dept.short_description ?? dept.description}</p>
            </div>
            <Button asChild size="lg"><Link to="/randevu" search={{ department: dept.id }}><CalendarCheck className="h-4 w-4" /> Bu bölümden randevu al</Link></Button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 lg:grid-cols-[1fr_340px]">
        <div className="space-y-12">
          {dept.long_description && (
            <section>
              <h2 className="text-2xl font-bold">Hakkında</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-muted-foreground">
                {dept.long_description.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </section>
          )}
          {faqs.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold">Sıkça Sorulan Sorular</h2>
              <Accordion type="single" collapsible className="mt-4 rounded-2xl border bg-card px-5">
                {faqs.map((f) => (
                  <AccordionItem key={f.id} value={f.id}>
                    <AccordionTrigger className="text-left font-semibold">{f.question}</AccordionTrigger>
                    <AccordionContent className="leading-relaxed text-muted-foreground">{f.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}
        </div>
        <aside>
          {dept.services.length > 0 && (
            <div className="rounded-2xl border bg-card p-6 lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold">Tedavi ve Hizmetler</h2>
              <ul className="mt-4 space-y-3">
                {dept.services.map((s) => <li key={s} className="flex gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{s}</li>)}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <section className="border-t bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold">Doktorlarımız</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((d) => (
              <Link key={d.id} to="/doktorlar/$slug" params={{ slug: d.slug ?? "" }} className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition hover:border-primary hover:shadow-soft">
                {d.photo_url ? <img src={d.photo_url} alt={d.full_name} className="h-16 w-16 rounded-full object-cover" />
                  : <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft font-display text-lg font-semibold text-primary">{initials(d.full_name)}</span>}
                <div>
                  <p className="font-semibold group-hover:text-primary">{d.title} {d.full_name}</p>
                  <p className="text-sm text-muted-foreground">{d.specialty}</p>
                </div>
              </Link>
            ))}
            {doctors.length === 0 && <p className="text-muted-foreground">Bu bölümde henüz doktor yok.</p>}
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
