# XMS Hastane Otomasyon

Hastane randevu, hasta kaydı ve yapay zekâ destekli hasta asistanı (Medi AI) içeren, eğitim amacıyla geliştirilmiş bir hastane otomasyon (mini ERP/CRM) projesidir. X Mind Solutions bünyesinde bir eğitim çalışması olarak hazırlanmıştır.

Canlı demo: https://xms-hastane-otomasyon.lovable.app

## Önemli Uyarı

Bu proje **eğitim ve demo amaçlıdır**. Gerçek hasta verisiyle üretimde kullanılmak üzere tasarlanmamıştır.

- Depodaki tüm veriler (doktorlar, hastalar, TC kimlik numaraları, telefonlar, randevular) **tamamen uydurmadır**.
- Uygulama düzeyinde ek bir şifreleme (alan bazlı şifreleme, KVKK uyumluluk denetimi vb.) yoktur. Hasta verisi veritabanında düz metin olarak tutulur; erişim yalnızca satır düzeyi güvenlik (RLS) kurallarıyla sınırlanır.
- MCP sunucusu ve genel REST API bilinçli olarak kimlik doğrulamasız (herkese açık) bırakılmıştır.
- `.env` dosyasındaki Supabase anahtarı yalnızca "publishable" (tarayıcıya açık olması tasarlanmış) anahtardır, gizli bir anahtar değildir. Kendi kurulumunuzda kendi Supabase projenizi kullanın.

Gerçek bir hastanede kullanmadan önce KVKK, sağlık verisi mevzuatı, şifreleme, yetkilendirme ve yedekleme gereksinimlerini mutlaka bir uzmanla gözden geçirin.

## Özellikler

- 10 departman, doktorlar ve asistanlar için yönetim
- Hastalar için herkese açık online randevu alma, sorgulama ve iptal
- Çift randevuyu engelleyen veritabanı kuralları (aynı doktor ve saat için tek aktif randevu)
- Personel paneli: randevular, hastalar, ziyaret notları, kapalı günler, kullanıcı onayı
- Rol tabanlı erişim: süper yönetici, yönetici, resepsiyon
- Medi AI: bilgi bankası (RAG, 768 boyutlu embedding) kullanan sohbet asistanı
- Herkese açık REST API (`/api/public/v1`) ve OpenAPI dokümantasyonu (`/api-docs`)
- MCP sunucusu (9 araç) ve bağlantı rehberi (`/mcp-baglanti`)
- Tüm kanallardaki (web sohbet, MCP, REST) işlemler için kişisel veri maskelenmiş denetim kaydı

## Teknoloji

TanStack Start (React, TypeScript), Tailwind CSS, shadcn/ui, Supabase (PostgreSQL, Auth, RLS), Drizzle, Vitest. Proje Lovable ile üretilmiş ve bu depoyla senkronize çalışmaktadır.

## Kurulum

Gereksinimler: Node.js ve bun (veya npm).

```sh
git clone https://github.com/mertcankaraoglu/xms-hastane-otomasyon.git
cd xms-hastane-otomasyon
bun install
bun run dev
```

Kendi Supabase projenizi oluşturup `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (ve `VITE_` önekli karşılıkları) değerlerini `.env` dosyasında güncelleyin, ardından `drizzle/migrations` klasöründeki SQL dosyalarını sırayla çalıştırın. Medi AI için sunucu tarafında bir yapay zekâ servis anahtarı gerekir; bu anahtarı asla depoya eklemeyin.

## Mimari Notlar

- Anonim kullanıcılar tablolara doğrudan erişmez; randevu, sorgulama ve iptal işlemleri SECURITY DEFINER fonksiyonları üzerinden yapılır.
- Tüm saatler Europe/Istanbul (UTC+3) olarak işlenir.
- Daha ayrıntılı proje kuralları için `AGENTS.md` dosyasına bakın.

## Katkı

Eğitim amaçlı paylaşılmıştır. Fikir, hata bildirimi ve katkılar için Issue veya Pull Request açabilirsiniz.

Geliştirici: X Mind Solutions - https://xmindsolutions.com
