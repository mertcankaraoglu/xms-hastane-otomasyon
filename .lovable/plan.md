# Medicare Hastanesi MCP Server (Claude + ChatGPT)

Hastane sistemini Claude ve ChatGPT'ye "connector" olarak bağlanabilir hale getiren, herkese açık (girişsiz) bir MCP server. Açık API ile aynı kurallar ve aynı veriler.

## Bağlantı
- Adres: `https://xms-hastane-otomasyon.lovable.app/mcp` (Streamable HTTP, MCP standardının güncel taşıma yöntemi).
- Claude: Ayarlar → Connectors → "Add custom connector" → adresi yapıştır. Claude.ai, Desktop ve Claude Code destekler.
- ChatGPT: Ayarlar → Apps & Connectors → Developer mode → "Create" → adres, kimlik doğrulama "No auth". (Özel connector için Plus/Pro/Business planı gerekir.)
- `/api-docs` sayfasına "Claude / ChatGPT'ye bağla" bölümü: adres ve adım adım talimat.

## Araçlar (9)
Bilgi (salt okunur)
1. `list_departments` — bölümler.
2. `get_department` — bölüm detayı, hizmetler, SSS, doktorlar.
3. `search_doctors` — bölüm/isim/uzmanlık ile doktor arama.
4. `get_doctor_profile` — doktorun yayınlanmış tam profili.
5. `get_hospital_info` — adres, saatler, ulaşım, sigorta vb. ve kapalı günler.
6. `search_knowledge` — bilgi bankasında anlamsal (RAG) arama, en yakın 5 madde.

Randevu
7. `get_available_slots` — doktorun bir gündeki boş saatleri.
8. `book_appointment` — randevu oluşturma (ad, TC, telefon); kodu döner.
9. `manage_appointment` — kod + telefon ile sorgulama veya iptal (iptal "yıkıcı işlem" olarak işaretli, asistan onay ister).

## Kurallar
- Açık API ile aynı doğrulamalar: 11 haneli TC, 0 ile başlayan 11 haneli telefon, kapalı gün/geçmiş saat/dolu saat reddi, çift randevu engeli.
- Sorgulama TC döndürmez, hasta adı maskeli.
- Hasta tablolarına doğrudan erişim yok; yalnızca mevcut güvenli veritabanı işlevleri.
- Sunucu talimatı: teşhis koyma, acilde 112, randevudan önce kullanıcıdan açık onay al.

## Riskler (bilginize)
- Girişsiz olduğu için kimin çağırdığı bilinmez; sahte randevu riski var (açık API'deki gibi). Gerekirse ileride personel için OAuth'lu ayrı bir server eklenebilir.
- `search_knowledge` her çağrıda yapay zekâ kredisi harcar (embedding).
- Yayınlamadan sonra çalışır; mevcut yayın yeniden yayınlanana kadar MCP içermez.

## Teknik detaylar
- `@lovable.dev/mcp-js` + `mcpPlugin()` (`vite.config.ts`), server `src/lib/mcp/index.ts` (`name: "xms-hastane-otomasyon"`, `title: "Xms Hastane Otomasyon"`), her araç `src/lib/mcp/tools/*.ts` içinde `defineTool`.
- Ortak iş mantığı `public-api.server.ts`'den saf fonksiyonlara ayrılır (listDepartments, doctorProfile, freeSlots, book, lookup, cancel); REST ve MCP aynı kodu kullanır.
- Veritabanı erişimi publishable-key istemcisiyle (`src/lib/mcp/supabase.ts` → `supabaseAnon()`), servis anahtarı yok, RLS değişmez.
- `structuredContent` ile JSON çıktı + kısa metin özeti; hatalar `ToolError` ile Türkçe.
- MCP çağrıları da IP hız sınırına (`api_hit`) tabi.
- Manifest çıkarımı (`extract_mcp_manifest`) ile doğrulama; ardından yayınlama.
