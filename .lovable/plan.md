# Hastane Randevu ve Yönetim Sistemi (v1)

## Kapsam
Odak: hasta randevu sistemi + yönetim paneli. Şimdilik sadece Admin (ve resepsiyon) giriş yapar. Departman/doktor/asistan bilgi olarak tutulur. Hastalar hesap açmadan herkese açık sayfadan online randevu alabilir; personel de panelden randevu girebilir.

## Sayfalar
**Herkese açık**
- `/` Hastane tanıtım sayfası: departmanlar, doktorlar, "Randevu Al" butonu
- `/randevu` Adım adım randevu: departman → doktor → tarih/saat (müsait slotlar) → hasta bilgileri (ad, TC, telefon, e-posta, şikayet) → onay ekranı + randevu kodu
- `/randevu-sorgula` Kod + telefon ile randevu görüntüleme / iptal

**Admin paneli (giriş gerekli)**
- `/auth` Giriş
- `/panel` Dashboard: bugünkü randevular, haftalık grafik, departman bazlı dağılım, doktor doluluk oranı, iptal/gelmedi oranları
- `/panel/takvim` Gün/hafta takvimi, doktor/departman filtresi, randevu oluştur/düzenle/durum değiştir (Bekliyor, Onaylandı, Geldi, Tamamlandı, İptal, Gelmedi)
- `/panel/randevular` Liste, arama, filtre, CSV dışa aktarım
- `/panel/hastalar` Hasta listesi + hasta detayı: tüm geçmiş randevular ve görüşme notları (doktor, tarih, şikayet, not)
- `/panel/departmanlar` 10 departman CRUD
- `/panel/doktorlar` Doktor CRUD (departman, uzmanlık, fotoğraf, çalışma saatleri, randevu süresi) + bağlı asistanlar
- `/panel/ayarlar` Tatil/kapalı günler, kullanıcı (admin/resepsiyon) yönetimi

## Veri modeli
departments, doctors (department_id, çalışma saatleri JSON, slot süresi), assistants (doctor_id), patients (TC, iletişim), appointments (patient, doctor, başlangıç/bitiş, durum, şikayet, kod), visit_notes (appointment_id, not), closed_days, user_roles (admin, reception).

## Teknik detaylar
- Lovable Cloud: veritabanı, e-posta/şifre girişi, roller ayrı `user_roles` tablosunda + `has_role` fonksiyonu.
- Çakışma engeli: aynı doktor + aynı saatte tek aktif randevu (DB unique/exclusion kısıtı).
- Public randevu oluşturma ve sorgulama `createServerFn` ile sunucu tarafında, doğrulama (zod) ile; hasta verisi anon'a açık değil.
- Panel rotaları `_authenticated` altında; sunucu fonksiyonları `requireSupabaseAuth` + rol kontrolü.
- Örnek veri: 10 departman, ~25 doktor, birkaç asistan migration ile eklenir.
- Tasarım: temiz, güven veren medikal tema (teal/koyu lacivert), Türkçe arayüz, mobil uyumlu.
- Sonraki aşamalar için hazır: hasta hesabı, SMS hatırlatma, doktor girişi, faturalama.
