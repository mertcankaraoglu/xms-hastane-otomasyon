# Medi AI — Hastane Sohbet Asistanı

## Ziyaretçinin göreceği
- Tüm halka açık sayfaların sağ altında el sallayan, animasyonlu hemşire karakteri "Medi AI" (hafif zıplama + el sallama animasyonu, ilk ziyarette "Merhaba! Size nasıl yardımcı olabilirim?" baloncuğu).
- Tıklayınca sağ altta sohbet penceresi açılır (mobilde tam ekran). Hazır öneri butonları: "Randevu al", "Randevumu sorgula", "Hangi bölüme gitmeliyim?", "Hastane hakkında".
- Tek konuşma: ziyaretçi aynı sohbete geri döner, "Yeni sohbet" ile sıfırlar.

## Medi AI neler yapar
- **Hastane bilgisi:** adres, ulaşım, otopark, çalışma saatleri, tarihçe, akreditasyonlar, anlaşmalı sigortalar, ziyaret saatleri, KVKK — hepsi oluşturacağım örnek bilgi bankasından cevaplanır (RAG).
- **Bölüm/doktor önerisi:** şikayete göre uygun bölümü ve doktorları önerir; teşhis koymaz, acil belirtilerde 112'ye yönlendirir.
- **Randevu oluşturma:** bölüm → doktor → uygun gün/saatleri gösterir → ad, TC, telefon alır → onay ister → mevcut randevu sistemiyle oluşturur ve randevu kodunu verir. Kapalı günler ve dolu saatler otomatik dikkate alınır.
- **Randevu sorgulama:** kod + telefon ile durum gösterir.
- Bölüm/doktor bilgileri her zaman canlı veriden okunur; panelden yaptığınız değişiklikler anında yansır.

## Panel
- Yeni "Bilgi Bankası" sayfası: hastane bilgi maddelerini ekle/düzenle/sil (Medi AI bunları kullanır).
- Yeni "Sohbetler" sayfası: ziyaretçi sohbetlerini okuma (personel).

## Oluşturacağım örnek içerik (sonra değiştirmeniz gerekecek)
Adres (Kadıköy/İstanbul), telefon, kuruluş tarihi ve tarihçe (1998), misyon/vizyon, akreditasyonlar, anlaşmalı kurumlar (SGK + özel sigortalar), ulaşım (Marmaray/metro/otobüs), otopark, ziyaret saatleri, refakatçi kuralları, check-up paketleri, tahlil sonuçları, ödeme yöntemleri — ~25 madde.

## Teknik detaylar
- Tablolar: `kb_articles` (title, category, content, embedding vector), `chat_conversations` (anonim ziyaretçi id'si tarayıcıda saklanır), `chat_messages`. Hasta verisi içeren sohbetler sadece personel tarafından okunabilir; ziyaretçi erişimi server function üzerinden, ziyaretçi id + gizli token ile.
- RAG: pgvector + `google/gemini-embedding-2` ile embedding; benzerlik araması RPC ile. Bilgi maddesi kaydedilince embedding yeniden üretilir.
- Model: varsayılan sohbet modeli (`openai/gpt-6-astra`, Responses surface) `@lovable.dev/ai-gateway` ile, streaming; araçlar (tool calling): `search_knowledge`, `list_departments`, `list_doctors`, `get_available_slots`, `book_appointment`, `lookup_appointment`. Randevu araçları mevcut SECURITY DEFINER RPC'leri ve `src/lib/slots.ts` mantığını kullanır.
- UI: AI Elements bileşenleri (mesajlar markdown ile, araç çağrıları katlanmış kartlarda), hemşire karakteri görseli üretilip CSS animasyonuyla oynatılır.
- Kötüye kullanıma karşı: konuşma başına mesaj sınırı ve ziyaretçi başına basit hız sınırı.
