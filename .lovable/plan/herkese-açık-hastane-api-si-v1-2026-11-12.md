# Herkese Açık Hastane API'si (v1)

Ön yüz olmadan hastane bilgisi ve randevu işlemleri için açık, belgeli bir REST API. Admin işlemleri kapsam dışı.

## Kararlar (cevaplarınıza göre)
- Kullanıcılar: mobil uygulama, partner/sigorta firmaları, WhatsApp/çağrı merkezi botu, dış geliştiriciler.
- Erişim: tamamen açık, anahtar yok. Kötüye kullanıma karşı IP başına hız sınırı uygulanır.
- Kapsam: bilgi, boş saat + randevu alma, randevu sorgulama + iptal. Medi AI sohbeti yok.
- Dokümantasyon: OpenAPI tanımı + denenebilir `/api-docs` sayfası.

## Uç noktalar (`/api/public/v1/...`)

Bilgi
- `GET /departments` — bölüm listesi (ad, slug, kısa açıklama, ikon, kapak).
- `GET /departments/{slug}` — detay, hizmetler, SSS, bölüm doktorları.
- `GET /doctors?department=&q=` — doktor listesi, bölüm ve isim filtresi.
- `GET /doctors/{slug}` — yayınlanmış profil (özgeçmiş, eğitim, kariyer, diller, sertifikalar, çalışma saatleri).
- `GET /closed-days?from=&to=` — tatil/kapalı günler.
- `GET /info` — iletişim, adres, çalışma saatleri (bilgi bankasından seçili maddeler).

Randevu
- `GET /doctors/{slug}/slots?date=YYYY-MM-DD` — o günün boş saatleri (İstanbul saati).
- `POST /appointments` — randevu oluşturma: doktor, başlangıç saati, ad soyad, TC, telefon (0 ile başlayan 11 hane), not. Dönen: randevu kodu.
- `POST /appointments/lookup` — kod + telefon ile sorgulama (GET yerine POST: telefon URL'de/loglarda görünmesin).
- `POST /appointments/cancel` — kod + telefon ile iptal.

## Davranış kuralları
- Tüm yazma/okuma mevcut güvenli veritabanı işlevleri üzerinden yapılır (`book_appointment`, `lookup_appointment`, `cancel_appointment_public`, `get_booked_slots`); hasta tablolarına doğrudan erişim yok.
- Çift randevu mevcut benzersiz kural ile engellenir; çakışmada `409 slot_taken`.
- Kapalı gün, geçmiş saat, çalışma saati dışı → `422` ve açıklayıcı hata kodu.
- Tek tip hata formatı: `{ error: { code, message } }`, mesajlar Türkçe.
- Sorgulama yanıtı hastanın TC'sini döndürmez; adı maskeli verir.
- Hız sınırı: okuma ~120/dk, randevu oluşturma/sorgulama/iptal ~10/dk IP başına; aşımda `429` + `Retry-After`.
- CORS açık (her kaynaktan çağrılabilir), `OPTIONS` desteklenir.
- Sürümleme `/v1`; ileride kırıcı değişiklik `/v2` olur.

## Dokümantasyon
- `GET /api/public/v1/openapi.json` — OpenAPI 3.1 tanımı (Zod şemalarından üretilir, kodla senkron kalır).
- `/api-docs` sayfası — uç nokta listesi, örnek istek/yanıtlar, "Dene" düğmesi; footer'a "Geliştiriciler" bağlantısı.

## Teknik detaylar
- Dosyalar: `src/routes/api/public/v1/*.ts` (TanStack server route, `server.handlers`), ortak katman `src/lib/public-api.server.ts` (Zod doğrulama, hata/CORS yardımcıları, yayınlanmış alan projeksiyonu).
- Supabase: handler içinde publishable-key istemcisi; mevcut `get_doctor_profile` ve slot mantığı (`src/lib/slots.ts`) yeniden kullanılır — Medi AI ile aynı kaynaklar.
- Hız sınırı: yeni `api_rate_limits` tablosu (ip hash + pencere + sayaç) ve `api_hit(ip, bucket, limit)` SECURITY DEFINER fonksiyonu; IP SHA-256 ile saklanır.
- Doc sayfası: `src/routes/api-docs.tsx`, OpenAPI JSON'unu okuyup kendi tasarımımızla render eder (ek kütüphane yok).
- Testler: telefon doğrulama, slot çakışması 409, kapalı gün 422, sorgulamada TC'nin dönmemesi, hız sınırı 429.
- AGENTS.md'ye "Public API yalnızca RPC'ler üzerinden, `/api/public/v1`" kuralı eklenir.

## Açık riskler
- Anahtarsız açık API'de kimin çağırdığı bilinemez; sahte randevu riski yalnızca hız sınırıyla azaltılır. İleride partnerler için isteğe bağlı API anahtarı eklenebilir.
