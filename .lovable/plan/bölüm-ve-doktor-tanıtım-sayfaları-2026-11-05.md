# Bölüm ve Doktor Tanıtım Sayfaları

## Ziyaretçinin göreceği sayfalar
- **/bolumler** — Tüm bölümler, kart düzeninde (ikon, kısa açıklama, doktor sayısı).
- **/bolumler/{bolum-adi}** — Bölüm detayı:
  - Üst bölüm: kapak görseli, bölüm adı, kısa tanıtım, "Bu bölümden randevu al" butonu
  - "Hakkında" uzun açıklama
  - "Tedavi ve hizmetler" listesi (madde madde)
  - Bölüm doktorları (fotoğraf, unvan, uzmanlık, profile git)
  - Sıkça Sorulan Sorular (açılır-kapanır)
- **/doktorlar** — Tüm doktorlar; bölüme göre filtre ve isimle arama.
- **/doktorlar/{doktor-adi}** — Doktor profili:
  - Fotoğraf, unvan, bölüm, uzmanlık, "Randevu al" (doktor seçili gelir)
  - Biyografi
  - Eğitim geçmişi ve kariyer zaman çizelgesi (yıl + kurum + açıklama)
  - İlgi alanları, konuştuğu diller, sertifikalar/üyelikler
  - Çalışma günleri/saatleri
- Ana sayfadaki bölüm kartları ve üst menü ("Bölümler", "Doktorlarımız") bu sayfalara bağlanır.
- Her sayfanın kendi başlık/açıklama bilgisi olur (Google ve paylaşım önizlemeleri için).
- Tasarım: mevcut teal/lacivert dil, yumuşak gölgeler, büyük tipografi, mobil uyumlu.

## Panelde düzenleme (yönetici + resepsiyon)
- **Departmanlar** düzenleme ekranı genişler: kısa tanıtım, uzun açıklama, hizmetler listesi, kapak görseli yükleme, SSS ekle/sil/sırala.
- **Doktorlar** düzenleme ekranı genişler: biyografi, fotoğraf yükleme, eğitim ve kariyer kayıtları (ekle/sil), ilgi alanları, diller, sertifikalar.
- Değişiklikler kaydedildiği anda sitede görünür.

## Başlangıç içeriği
Mevcut 10 bölüm ve 25 doktor için örnek Türkçe metin, SSS ve kariyer geçmişi doldurulur; sonra panelden gerçeğiyle değiştirirsiniz.

## Teknik detaylar
- `departments`: `slug` (unique), `short_description`, `long_description`, `services text[]`, `cover_url` eklenir. Yeni `department_faqs` (department_id, question, answer, sort_order) tablosu: anon+auth okuma, `is_staff` yazma.
- `doctors`: `slug` (unique), `education jsonb`, `experience jsonb` ([{year_from, year_to, institution, title}]), `interests text[]`, `languages text[]`, `certifications text[]` eklenir. Mevcut anon okuma politikası (yalnızca aktif) korunur.
- Slug'lar Türkçe karakter dönüşümüyle mevcut isimlerden backfill edilir.
- Görseller için herkese açık `media` depolama alanı; yükleme sadece personel.
- Rotalar: `bolumler.index.tsx`, `bolumler.$slug.tsx`, `doktorlar.index.tsx`, `doktorlar.$slug.tsx`; veriler loader + query ile, bulunamazsa notFound.
- `randevu.tsx` `doctor` arama parametresini kabul eder.
- Örnek içerik veri sorgusuyla eklenir (şema değişikliğinden ayrı).
