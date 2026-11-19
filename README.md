# Xms Hastane Otomasyon

**Tech Istanbul eğitimi** kapsamında öğrencilerle birlikte, yapay zekâ destekli geliştirme araçları ([Lovable](https://lovable.dev) ve Claude Code) kullanılarak canlı olarak geliştirilen örnek bir hastane randevu ve yönetim sistemi.

> ⚠️ **Eğitim amaçlı demo projedir.** "Medicare Hastanesi", doktorlar, hastalar ve iletişim bilgileri tamamen kurgusaldır. Gerçek hasta verisiyle üretimde kullanmadan önce KVKK uyumu, güvenlik denetimi ve sızma testi yapılmalıdır.

**Canlı demo:** https://xms-hastane-otomasyon.lovable.app

## Başlangıç fikri

Proje, Lovable'a verilen şu tek cümlelik istekle başladı:

> Benim bir hastanem var. Bu hastanemde 10 departman var, bunların altında doktorlar var, bazı doktorlarda asistanlar var. Bir de müşteri tarafımız var. Bize çok kapsamlı, her yönü ile çalışan bir sistem lazım. Hastane ERP/CRM gibi. Randevu, geçmiş hasta-doktor görüşmeleri vb. tüm kayıtlar olmalı. Bana soracağın tüm soruları sor.

Sonrasında özellikler adım adım eklendi (bkz. [`roadmap.md`](roadmap.md) ve [`.lovable/plan/`](.lovable/plan/)).

## Özellikler

### Hasta tarafı (herkese açık)
- Bölüm ve doktor tanıtım sayfaları (`/bolumler`, `/doktorlar`)
- Online randevu alma (`/randevu`) — dolu saatler gösterilir, çift randevu veritabanı seviyesinde engellenir
- Randevu kodu + telefon ile sorgulama ve iptal (`/randevu-sorgula`)
- **Medi AI** sohbet asistanı — bilgi bankası (RAG) ve doktor profilleri üzerinden yanıt verir, randevu almaya yardımcı olur

### Personel paneli (`/panel`)
- Rol tabanlı erişim: `superadmin`, `admin`, `reception` (yeni kayıtlar superadmin onayı bekler)
- Randevular, takvim, hastalar ve hasta geçmişi (muayene notları)
- Departman ve doktor profili yönetimi
- Bilgi bankası (KB) yönetimi — makaleler kaydedilirken embedding'leri yeniden üretilir
- Sohbet kayıtları ve kaynak (provenance) görünümü; web sohbeti, MCP ve REST çağrılarının tek denetim kaydı
- Ayarlar: kapalı günler, kullanıcı onayı (yalnızca superadmin)

### Entegrasyonlar
- **Public REST API** — `/api/public/v1/*`, OpenAPI dokümanı `/api-docs`, Swagger UI `/api-docs/swagger`; IP bazlı hız sınırı
- **MCP sunucusu** — `/mcp` (Claude, ChatGPT vb. istemcilerden bağlanmak için), bağlantı rehberi `/mcp-baglanti`

## Teknoloji

- [TanStack Start](https://tanstack.com/start) (React 19, SSR) + Vite
- Tailwind CSS 4 + shadcn/ui
- Supabase (PostgreSQL, Auth, RLS, `SECURITY DEFINER` RPC'ler, pgvector)
- Lovable AI Gateway (sohbet ve embedding)
- Vitest

## Güvenlik tasarımı (öğrenme notları)

- Anonim kullanıcılar tablolara **doğrudan erişmez**; randevu alma/sorgulama/iptal yalnızca `SECURITY DEFINER` RPC'ler üzerinden yapılır.
- Tüm tablolarda Row Level Security (RLS) açıktır; personel yetkisi `is_staff()` ile kontrol edilir.
- Çift randevu, `(doctor_id, starts_at)` üzerinde kısmi unique index ile engellenir.
- Telefon doğrulaması hem tarayıcıda hem RPC içinde yapılır (istemci kontrolü atlatılamaz).
- Log'lardaki kişisel veriler maskelenir (`src/lib/event-log.server.ts`).
- `.env` içindeki `SUPABASE_PUBLISHABLE_KEY` tarayıcıya gömülmek üzere tasarlanmış **public** bir anahtardır. Gizli anahtarlar (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, `LOVABLE_CRON_SECRET`) repoda değil, Lovable Secrets'ta tutulur.

## Proje yapısı

```
src/
  routes/                 # Sayfalar ve API route'ları (dosya tabanlı routing)
    _authenticated/       # Personel paneli (/panel/*)
    api/                  # /api/chat ve /api/public/v1/*
  lib/
    slots.ts              # Randevu slot hesapları (Europe/Istanbul)
    phone.ts              # Telefon doğrulama
    medi-ai.server.ts     # Sohbet asistanı ajan döngüsü ve araçları
    public-api.server.ts  # REST API
    public-api.openapi.ts # OpenAPI şeması
    mcp/                  # MCP sunucusu ve araçları
  integrations/supabase/  # Supabase istemcileri (otomatik üretilir)
drizzle/migrations/       # Veritabanı şeması ve demo verisi
```

## Yerelde çalıştırma

Node.js (veya [Bun](https://bun.sh)) gerekir.

```sh
git clone https://github.com/mertcankaraoglu/xms-hastane-otomasyon.git
cd xms-hastane-otomasyon
npm i
npm run dev
```

Testler:

```sh
npm test
```

> Not: Repodaki `.env` demo Supabase projesine bağlanır. Kendi kopyanızı çalıştırmak için kendi Supabase projenizi oluşturup `drizzle/migrations/` altındaki SQL dosyalarını sırayla uygulayın ve `.env` değerlerini güncelleyin. Medi AI sohbeti sunucu tarafında `LOVABLE_API_KEY` gerektirir.

## Lovable ile geliştirme

Bu repo Lovable projesine bağlıdır; Lovable editöründe yapılan değişiklikler buraya, buraya push edilen değişiklikler Lovable'a senkronlanır. Yayınlanmış git geçmişini yeniden yazmayın (force push, rebase vb.). Ayrıntılar için [`AGENTS.md`](AGENTS.md).

## Teşekkür

Tech Istanbul eğitimine katılan tüm öğrencilere 🙌
