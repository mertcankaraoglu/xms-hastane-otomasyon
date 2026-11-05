import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { listDepartmentsPublic } from "@/lib/public-content.functions";
import { HOSPITAL_NAME, iconFor } from "@/lib/hospital";

export const Route = createFileRoute("/bolumler/")({
  loader: () => listDepartmentsPublic(),
  head: () => ({
    meta: [
      { title: `Bölümlerimiz — ${HOSPITAL_NAME}` },
      { name: "description", content: "Kardiyolojiden göz hastalıklarına tüm uzmanlık bölümlerimizi ve hizmetlerimizi keşfedin." },
      { property: "og:title", content: `Bölümlerimiz — ${HOSPITAL_NAME}` },
      { property: "og:description", content: "Uzmanlık bölümlerimiz, hizmetlerimiz ve doktor kadromuz." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
  notFoundComponent: () => <div className="p-10 text-center">Bulunamadı.</div>,
  component: DeptList,
});

function DeptList() {
  const depts = Route.useLoaderData();
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <section className="bg-hero">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <span className="inline-block rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-accent-foreground">{depts.length} uzmanlık alanı</span>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">Her ihtiyacınız için uzman bir bölüm.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">Bölümlerimizi inceleyin, hizmetleri ve doktorlarımızı tanıyın, dilediğinizde online randevu alın.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-14 sm:grid-cols-2 lg:grid-cols-3">
        {depts.map((d) => {
          const Icon = iconFor(d.icon);
          return (
            <Link key={d.id} to="/bolumler/$slug" params={{ slug: d.slug ?? "" }} className="group flex flex-col rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:border-primary hover:shadow-soft">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="h-6 w-6" /></span>
              <h2 className="mt-4 text-xl font-semibold">{d.name}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{d.short_description ?? d.description}</p>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{d.count} doktor</span>
                <span className="flex items-center gap-1 font-medium text-primary">İncele <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </div>
            </Link>
          );
        })}
      </section>
      <PublicFooter />
    </div>
  );
}
