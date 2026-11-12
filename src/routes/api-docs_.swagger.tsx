import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { HOSPITAL_NAME } from "@/lib/hospital";

const SwaggerView = lazy(() => import("@/components/SwaggerView"));
const T = `Swagger API — ${HOSPITAL_NAME}`;
const D = "Medicare Hastanesi herkese açık API'sinin Swagger arayüzü: uç noktaları inceleyin ve deneyin.";

export const Route = createFileRoute("/api-docs_/swagger")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D },
    { property: "og:title", content: T }, { property: "og:description", content: D },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: SwaggerPage,
});

function SwaggerPage() {
  const fallback = <div className="py-20 text-center text-muted-foreground">Swagger yükleniyor…</div>;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <Link to="/api-docs" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Geliştirici sayfasına dön</Link>
        <div className="swagger-theme mt-4 rounded-xl border bg-card p-2">
          <ClientOnly fallback={fallback}><Suspense fallback={fallback}><SwaggerView /></Suspense></ClientOnly>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
