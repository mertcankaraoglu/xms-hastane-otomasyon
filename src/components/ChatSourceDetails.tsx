import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";

export type ChatSource = { id: string; title: string; similarity: number | null; query: string };

export function readChatSources(value: unknown): ChatSource[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.title !== "string") return [];
    return [{ id: item.id, title: item.title, similarity: typeof item.similarity === "number" && Number.isFinite(item.similarity) ? item.similarity : null, query: typeof item.query === "string" ? item.query : "" }];
  });
}

export function ChatSourceDetails({ sources }: { sources: ChatSource[] }) {
  const ids = [...new Set(sources.map((source) => source.id))].sort();
  const { data: articles = [], isPending, isError } = useQuery({
    queryKey: ["chat-source-articles", ids], enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("kb_articles")
        .select("id, title, category, content, source_name, updated_at").in("id", ids);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="mt-3 border-t border-border pt-3 text-xs">
      <p className="flex items-center gap-1.5 font-semibold"><BookOpen className="h-3.5 w-3.5" /> Kaynak incelemesi</p>
      {sources.length === 0 ? (
        <div className="mt-2 space-y-1 text-muted-foreground">
          <p>RAG kaynağı kaydı yok.</p>
          <p>Bu yanıtta bilgi bankasından getirilen bir kaynak kaydedilmemiş. Doktor profili ve randevu araçlarının çağrıları mevcut kayıtlarda tutulmadığından, kullanılan aracı bu mesaj için doğrulayamıyoruz.</p>
        </div>
      ) : (
        <>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">Kaynak türü</dt><dd>Bilgi Bankası · RAG</dd>
            <dt className="text-muted-foreground">Getirilen kaynak</dt><dd>{sources.length}</dd>
            <dt className="text-muted-foreground">Arama sorguları</dt><dd className="min-w-0 break-words">{[...new Set(sources.map((s) => s.query).filter(Boolean))].join(" · ") || "Kaydedilmemiş"}</dd>
          </dl>
          <p className="mt-2 text-muted-foreground">Bunlar modele getirilen aday kaynaklardır; her kaynağın cevapta gerçekten kullanıldığı veya cevabın doğruluğu kanıtlanmış değildir.</p>
          <Accordion type="multiple" className="mt-2">
            {sources.map((source, index) => {
              const article = articles.find((a) => a.id === source.id);
              return (
                <AccordionItem key={`${source.id}-${index}`} value={`${source.id}-${index}`}>
                  <AccordionTrigger className="gap-2 py-2 text-xs">
                    <span className="min-w-0 break-words">{source.title}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                      <dt className="text-muted-foreground">Kaynak ID</dt><dd className="min-w-0 break-all font-mono">{source.id}</dd>
                      <dt className="text-muted-foreground">Arama sorgusu</dt><dd className="min-w-0 break-words">{source.query || "Kaydedilmemiş"}</dd>
                      <dt className="text-muted-foreground">Benzerlik skoru</dt><dd>{source.similarity !== null ? `${source.similarity.toFixed(2)} · Vektör araması` : "Kaydedilmemiş · Skorsuz sonuç"}</dd>
                      {article && <><dt className="text-muted-foreground">Kategori</dt><dd>{article.category}</dd><dt className="text-muted-foreground">Doküman</dt><dd className="min-w-0 break-words">{article.source_name || "Panelde oluşturulan bilgi maddesi"}</dd><dt className="text-muted-foreground">Son güncelleme</dt><dd>{new Date(article.updated_at).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</dd></>}
                    </dl>
                    {source.similarity !== null && <p className="mt-2 text-muted-foreground">Skor, sorgu ile kaynak arasındaki vektör benzerliğidir; güven yüzdesi değildir.</p>}
                    <div className="mt-3 border-t pt-2">
                      <p className="flex items-center gap-1 font-medium"><FileText className="h-3.5 w-3.5" /> Kaynağın güncel metni</p>
                      {article ? <><p className="mt-1 text-muted-foreground">Yanıt anındaki metin saklanmadı. Aşağıdaki içerik sonradan düzenlenmiş olabilir.</p><p className="mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap break-words">{article.content}</p></>
                        : <p className="mt-1 text-muted-foreground">{isPending ? "Kaynak metni yükleniyor…" : isError ? "Kaynak metni alınamadı." : "Kaynak silinmiş veya artık erişilemiyor; yanıtın kaynak kaydı korunuyor."}</p>}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </>
      )}
    </div>
  );
}