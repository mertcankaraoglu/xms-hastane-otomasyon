import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy, Bot, Plug, ShieldCheck, Wrench, MessageSquare, LifeBuoy } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { HOSPITAL_NAME } from "@/lib/hospital";

const URL = "https://xms-hastane-otomasyon.lovable.app/mcp";
const T = `Yapay Zekâ Bağlantısı (MCP) — ${HOSPITAL_NAME}`;
const D = "Medicare Hastanesi'ni Claude, ChatGPT, Cursor ve VS Code'a MCP ile bağlayın: bölüm, doktor bilgisi ve randevu işlemleri.";

export const Route = createFileRoute("/mcp-baglanti")({
  head: () => ({ meta: [
    { title: T }, { name: "description", content: D },
    { property: "og:title", content: T }, { property: "og:description", content: D },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: McpPage,
});

const TOOLS: [string, string][] = [
  ["list_departments", "Tüm bölümleri listeler."],
  ["get_department", "Bölüm açıklaması, hizmetler, SSS ve doktorlar."],
  ["search_doctors", "Bölüm, ad veya uzmanlıkla doktor arama."],
  ["get_doctor_profile", "Özgeçmiş, eğitim, kariyer, diller, sertifikalar, çalışma saatleri."],
  ["get_hospital_info", "Adres, saatler, ulaşım, sigorta, ziyaret kuralları ve kapalı günler."],
  ["search_knowledge", "Bilgi bankasında anlamsal (RAG) arama."],
  ["get_available_slots", "Doktorun bir gündeki boş saatleri."],
  ["book_appointment", "Onaydan sonra randevu oluşturur, kod döner."],
  ["manage_appointment", "Kod + telefonla sorgulama veya iptal (iptal onay ister)."],
];

const PROMPTS = [
  "Kardiyolojide hangi doktorlar var, Ahmet Yılmaz'ın özgeçmişini anlatır mısın?",
  "Gözüm ağrıyor, yarın için göz doktorundan randevu almak istiyorum.",
  "Otopark ücretli mi, hangi sigortalarla anlaşmanız var?",
  "5A6ED8B3 kodlu randevumu 05xx xxx xx xx numarasıyla sorgular mısın?",
];

function Copyable({ text, block = false }: { text: string; block?: boolean }) {
  const [ok, setOk] = useState(false);
  const copy = () => { void navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); };
  return (
    <div className={`relative rounded-lg border bg-muted ${block ? "p-4" : "flex items-center gap-2 px-3 py-2"}`}>
      <pre className={`overflow-x-auto font-mono text-sm text-foreground ${block ? "pr-10" : "flex-1"}`}>{text}</pre>
      <Button size="icon" variant="ghost" className={block ? "absolute right-2 top-2 h-8 w-8" : "h-8 w-8"} onClick={copy} aria-label="Kopyala">
        {ok ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Bot; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground"><Icon className="h-5 w-5 text-primary" />{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

const Steps = ({ items }: { items: React.ReactNode[] }) => (
  <ol className="list-decimal space-y-1.5 pl-5">{items.map((x, i) => <li key={i}>{x}</li>)}</ol>
);
const B = ({ children }: { children: React.ReactNode }) => <strong className="text-foreground">{children}</strong>;

function McpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-12">
        <div>
          <h1 className="font-display text-4xl font-semibold text-foreground">Yapay Zekâ Bağlantısı (MCP)</h1>
          <p className="mt-3 text-muted-foreground">
            MCP (Model Context Protocol), yapay zekâ asistanlarının dış sistemlere güvenli şekilde bağlanmasını sağlayan açık bir standarttır.
            Hastanemizi Claude veya ChatGPT'ye ekleyince asistan bölümler, doktorlar ve boş saatler hakkında güncel bilgi verir, sizin onayınızla randevu alır.
          </p>
        </div>

        <Section icon={Plug} title="Server adresi">
          <Copyable text={URL} />
          <p>Taşıma: <B>Streamable HTTP</B> · Kimlik doğrulama: <B>Yok (No auth)</B> · Saat dilimi: Europe/Istanbul</p>
        </Section>

        <Section icon={Bot} title="Claude'a bağlama">
          <p><B>Claude.ai (web) ve Claude Desktop</B> — Pro, Max, Team ve Enterprise planlarında:</p>
          <Steps items={[<>Sol alttan <B>Ayarlar → Connectors</B> bölümüne gidin.</>, <><B>Add custom connector</B> düğmesine tıklayın.</>, <>Ad: <B>Medicare Hastanesi</B>, URL: yukarıdaki adres. OAuth alanlarını boş bırakın.</>, <><B>Add</B> deyin; sohbette araç menüsünden connector'ı açın.</>]} />
          <p className="pt-2"><B>Claude Code (terminal)</B>:</p>
          <Copyable block text={`claude mcp add --transport http medicare ${URL}`} />
        </Section>

        <Section icon={MessageSquare} title="ChatGPT'ye bağlama">
          <Steps items={[<><B>Ayarlar → Apps & Connectors → Advanced settings</B> altından <B>Developer mode</B>'u açın.</>, <><B>Apps & Connectors</B> ekranında <B>Create</B>'e tıklayın.</>, <>Ad: <B>Medicare Hastanesi</B>, MCP Server URL: yukarıdaki adres, Authentication: <B>No authentication</B>.</>, <>Uyarıyı onaylayıp kaydedin; yeni sohbette <B>+ → Developer mode</B> menüsünden connector'ı seçin.</>]} />
          <p>Developer mode Plus, Pro, Business, Enterprise ve Edu planlarında bulunur; randevu oluşturma gibi işlemlerde ChatGPT sizden onay ister.</p>
        </Section>

        <Section icon={Wrench} title="Cursor, VS Code ve diğer istemciler">
          <p><B>Cursor</B> (<code>~/.cursor/mcp.json</code>) ve diğer çoğu istemci:</p>
          <Copyable block text={JSON.stringify({ mcpServers: { medicare: { url: URL } } }, null, 2)} />
          <p><B>VS Code</B> (<code>.vscode/mcp.json</code>):</p>
          <Copyable block text={JSON.stringify({ servers: { medicare: { type: "http", url: URL } } }, null, 2)} />
          <p>Yalnızca stdio destekleyen istemciler için köprü:</p>
          <Copyable block text={`npx -y mcp-remote ${URL}`} />
        </Section>

        <Section icon={Wrench} title="Araçlar (9)">
          <div className="divide-y rounded-lg border">
            {TOOLS.map(([n, d]) => (
              <div key={n} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:gap-4">
                <code className="w-48 shrink-0 font-mono text-foreground">{n}</code><span>{d}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={MessageSquare} title="Örnek istekler">
          <ul className="space-y-2">{PROMPTS.map((p) => <li key={p} className="rounded-lg bg-muted px-3 py-2 text-foreground">“{p}”</li>)}</ul>
        </Section>

        <Section icon={ShieldCheck} title="Gizlilik ve sınırlar">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Giriş gerekmez; bilgiler herkese açık olan bilgilerle aynıdır.</li>
            <li>Randevu alırken ad, TC ve telefon yalnızca randevu için kullanılır. Sorgulamada TC gösterilmez, ad maskelenir.</li>
            <li>Randevu sorgulama ve iptal için randevu kodu ve kayıtlı telefon gerekir.</li>
            <li>Asistan teşhis koymaz. Acil durumda <B>112</B>'yi arayın.</li>
            <li>İstek sınırı: dakikada 120 okuma, 10 randevu işlemi.</li>
          </ul>
        </Section>

        <Section icon={LifeBuoy} title="Sorun giderme">
          <ul className="list-disc space-y-1.5 pl-5">
            <li><B>Bağlanmıyor:</B> Adresin sonunda <code>/mcp</code> olduğundan ve kimlik doğrulamanın "yok" seçildiğinden emin olun.</li>
            <li><B>Araçlar görünmüyor:</B> Connector'ı sohbet içinde etkinleştirin veya yenileyin.</li>
            <li><B>"slot_taken / slot_unavailable":</B> Saat doldu; boş saatleri yeniden isteyin.</li>
            <li><B>"tc_phone_mismatch":</B> TC farklı telefonla kayıtlı; kayıtlı telefonu kullanın. <B>"too_many_active":</B> en fazla 3 ileri tarihli aktif randevu. <B>"same_day_duplicate":</B> aynı gün aynı doktora ikinci randevu alınamaz.</li>
            <li><B>"rate_limited":</B> Bir dakika bekleyip tekrar deneyin.</li>
            <li>REST API tercih ederseniz: <Link to="/api-docs" className="text-primary underline">Geliştirici API</Link>.</li>
          </ul>
        </Section>
      </main>
      <PublicFooter />
    </div>
  );
}
