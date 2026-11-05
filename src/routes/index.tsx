import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { supabase } from "@/integrations/supabase/client";
import { iconFor, HOSPITAL_NAME } from "@/lib/hospital";
import hero from "@/assets/hospital-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${HOSPITAL_NAME} — Online Randevu` },
      { name: "description", content: "10 uzmanlık bölümü ve deneyimli doktor kadromuzdan dakikalar içinde online randevu alın." },
      { property: "og:title", content: `${HOSPITAL_NAME} — Online Randevu` },
      { property: "og:description", content: "Bölüm ve doktor seçin, uygun saati belirleyin, randevunuz hazır." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data } = useQuery({
    queryKey: ["public-departments"],
    queryFn: async () => {
      const [d, doc] = await Promise.all([
        supabase.from("departments").select("*").order("sort_order"),
        supabase.from("doctors").select("id, department_id"),
      ]);
      return (d.data ?? []).map((x) => ({ ...x, count: (doc.data ?? []).filter((y) => y.department_id === x.id).length }));
    },
  });

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <section className="bg-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-block rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-accent-foreground">7/24 online randevu</span>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">Sağlığınız için doğru uzmana, doğru zamanda.</h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">Bölümünüzü ve doktorunuzu seçin, uygun saati belirleyin. Hesap açmanıza gerek yok.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/randevu">Hemen Randevu Al</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/randevu-sorgula">Randevumu Sorgula</Link></Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /> Anında onay kodu</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Gerçek zamanlı müsaitlik</span>
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Verileriniz güvende</span>
            </div>
          </div>
          <img src={hero} alt="Hastane lobisi" width={1280} height={960} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-soft" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold">Bölümlerimiz</h2>
        <p className="mt-2 text-muted-foreground">Uzman kadromuzla 10 farklı branşta hizmet veriyoruz.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {(data ?? []).map((d) => {
            const Icon = iconFor(d.icon);
            return (
              <Link key={d.id} to="/bolumler/$slug" params={{ slug: d.slug ?? "" }} className="group rounded-xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-soft">
                <Icon className="h-7 w-7 text-primary" />
                <h3 className="mt-3 font-semibold leading-snug">{d.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{d.count} doktor</p>
              </Link>
            );
          })}
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
