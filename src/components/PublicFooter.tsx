import { Link } from "@tanstack/react-router";
import { Clock, Cross, Mail, MapPin, Phone } from "lucide-react";
import { HOSPITAL_NAME } from "@/lib/hospital";

export function PublicFooter() {
  return (
    <footer className="mt-auto bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Cross className="h-4 w-4" /></span>
            {HOSPITAL_NAME}
          </Link>
          <p className="mt-4 text-sm leading-relaxed opacity-70">Uzman kadromuz ve modern altyapımızla, sağlığınızı güvenle emanet edebileceğiniz bir hastane.</p>
        </div>
        <FooterCol title="Kurumsal">
          <FLink to="/bolumler">Bölümlerimiz</FLink>
          <FLink to="/doktorlar">Doktorlarımız</FLink>
          <FLink to="/auth">Personel Girişi</FLink>
        </FooterCol>
        <FooterCol title="Hasta Hizmetleri">
          <FLink to="/randevu">Online Randevu</FLink>
          <FLink to="/randevu-sorgula">Randevu Sorgula / İptal</FLink>
        </FooterCol>
        <FooterCol title="İletişim">
          <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Atatürk Cad. No: 1, Kadıköy / İstanbul</li>
          <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> 0 (216) 000 00 00</li>
          <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> info@medicarehastanesi.com</li>
          <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Hafta içi 08:00–18:00 · Acil 7/24</li>
        </FooterCol>
      </div>
      <div className="border-t border-ink-foreground/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs opacity-60 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {HOSPITAL_NAME}. Tüm hakları saklıdır.</span>
          <span>KVKK Aydınlatma Metni · Gizlilik Politikası</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-sm opacity-80">{children}</ul>
    </div>
  );
}

function FLink({ to, children }: { to: "/bolumler" | "/doktorlar" | "/auth" | "/randevu" | "/randevu-sorgula"; children: React.ReactNode }) {
  return <li><Link to={to} className="transition hover:text-primary">{children}</Link></li>;
}

export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
