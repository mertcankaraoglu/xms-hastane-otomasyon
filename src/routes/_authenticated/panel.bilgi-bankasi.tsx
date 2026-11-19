import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileUp, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { importKbDocument, reindexKb, saveKbArticle } from "@/lib/medi-ai.functions";
import { extractText } from "@/lib/doc-extract";
import { EMBEDDING } from "@/lib/embedding-info";

function TechInfo({ r }: { r: { dims: number; content: string; title: string; category: string; updated_at: string; created_at: string; id: string; indexed: boolean } }) {
  const items: [string, string][] = [
    ["Model", EMBEDDING.model],
    ["Sağlayıcı", EMBEDDING.provider],
    ["Boyut", r.indexed ? `${r.dims} (beklenen ${EMBEDDING.dimensions})` : "—"],
    ["Depolama", EMBEDDING.store],
    ["Arama", EMBEDDING.metric],
    ["Embed girdisi", `${(r.title + r.category + r.content).length + 2} karakter (başlık + kategori + içerik)`],
    ["İçerik", `${r.content.length} karakter`],
    ["Durum", r.indexed ? "İndekslendi" : "İndekslenmedi"],
    ["Son güncelleme", new Date(r.updated_at).toLocaleString("tr-TR")],
    ["Oluşturulma", new Date(r.created_at).toLocaleString("tr-TR")],
    ["ID", r.id],
  ];
  return (
    <dl className="mt-2 grid gap-x-4 gap-y-1 rounded-lg bg-muted/50 p-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([k, v]) => <div key={k} className="flex min-w-0 gap-1"><dt className="shrink-0 text-muted-foreground">{k}:</dt><dd className="truncate font-mono" title={v}>{v}</dd></div>)}
    </dl>
  );
}

export const Route = createFileRoute("/_authenticated/panel/bilgi-bankasi")({
  head: () => ({ meta: [{ title: "Bilgi Bankası — Yönetim Paneli" }, { name: "description", content: "Medi AI bilgi bankası" }, { property: "og:title", content: "Bilgi Bankası" }, { property: "og:description", content: "Medi AI bilgi bankası" }] }),
  component: KbPage,
});

type Form = { id: string | null; title: string; category: string; content: string };
const kbQuery = { queryKey: ["kb"], queryFn: async () => {
  const { data, error } = await supabase.from("kb_articles").select("id, title, category, content, sort_order, embedding, source_name, created_at, updated_at").order("sort_order").order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, indexed: !!r.embedding, dims: r.embedding ? r.embedding.split(",").length : 0, embedding: undefined }));
} };

function KbPage() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery(kbQuery);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const save = useServerFn(saveKbArticle);
  const reindex = useServerFn(reindexKb);
  const importDoc = useServerFn(importKbDocument);
  const [upload, setUpload] = useState<{ file: File | null; category: string } | null>(null);
  const [importing, setImporting] = useState(false);

  async function onImport() {
    if (!upload?.file) return;
    setImporting(true);
    try {
      const text = (await extractText(upload.file)).trim();
      if (text.length < 20) throw new Error("Dokümandan metin çıkarılamadı (taranmış PDF olabilir)");
      const r = await importDoc({ data: { name: upload.file.name, category: upload.category || "Doküman", text: text.slice(0, 400_000) } });
      toast.success(`${upload.file.name}: ${r.count} parça eklendi ve indekslendi`);
      setUpload(null); qc.invalidateQueries({ queryKey: ["kb"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Hata"); }
    finally { setImporting(false); }
  }
  async function onDeleteDoc(name: string) {
    if (!confirm(`"${name}" dokümanının tüm parçaları silinsin mi?`)) return;
    const { error } = await supabase.from("kb_articles").delete().eq("source_name", name);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["kb"] });
  }

  async function onSave() {
    if (!form) return;
    setSaving(true);
    try { await save({ data: form }); toast.success("Kaydedildi"); setForm(null); qc.invalidateQueries({ queryKey: ["kb"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Hata"); }
    finally { setSaving(false); }
  }
  async function onDelete(id: string) {
    if (!confirm("Bu madde silinsin mi?")) return;
    const { error } = await supabase.from("kb_articles").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["kb"] });
  }
  async function onReindex() {
    setReindexing(true);
    try { const r = await reindex(); toast.success(`${r.count} madde yeniden indekslendi`); qc.invalidateQueries({ queryKey: ["kb"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Hata"); }
    finally { setReindexing(false); }
  }

  const missing = rows.filter((r) => !r.indexed).length;
  const manual = rows.filter((r) => !r.source_name);
  const docs = Object.entries(rows.filter((r) => r.source_name).reduce<Record<string, typeof rows>>((acc, r) => { (acc[r.source_name!] ??= []).push(r); return acc; }, {}));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bilgi Bankası</h1>
          <p className="text-sm text-muted-foreground">Medi AI asistanı hastane hakkındaki soruları bu maddelere göre yanıtlar.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReindex} disabled={reindexing}><RefreshCw className={`h-4 w-4 ${reindexing ? "animate-spin" : ""}`} /> Yeniden indeksle{missing ? ` (${missing})` : ""}</Button>
          <Button variant="outline" onClick={() => setUpload({ file: null, category: "Doküman" })}><FileUp className="h-4 w-4" /> Doküman yükle</Button>
          <Button onClick={() => setForm({ id: null, title: "", category: "Genel", content: "" })}><Plus className="h-4 w-4" /> Yeni madde</Button>
        </div>
      </div>
      {docs.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Yüklenen dokümanlar</h2>
          {docs.map(([name, parts]) => (
            <details key={name} className="rounded-xl border bg-card p-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3">
                <span className="font-semibold"><FileUp className="mr-2 inline h-4 w-4 text-primary" />{name}
                  <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{parts[0]?.category}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{parts.length} parça</span></span>
                <Button size="icon" variant="ghost" onClick={(e) => { e.preventDefault(); onDeleteDoc(name); }}><Trash2 className="h-4 w-4" /></Button>
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">Parçalama: ~{EMBEDDING.chunkSize} karakter, paragraf sınırlarında · {parts.length} parça · her parça ayrı vektör</p>
                {parts.map((p, i) => <div key={p.id} className="border-l-2 pl-3"><p className="text-xs font-medium">Parça {i + 1}/{parts.length}</p><p className="line-clamp-2 text-sm text-muted-foreground">{p.content}</p><TechInfo r={p} /></div>)}
              </div>
            </details>
          ))}
          <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Maddeler</h2>
        </div>
      )}
      <div className="grid gap-3">
        {manual.map((r) => (
          <div key={r.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{r.title} <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{r.category}</span>
                  {!r.indexed && <span className="ml-2 text-xs text-destructive">indekslenmedi</span>}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.content}</p>
                <TechInfo r={r} />
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => setForm({ id: r.id, title: r.title, category: r.category, content: r.content })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!upload} onOpenChange={(o) => !o && !importing && setUpload(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Doküman yükle</DialogTitle></DialogHeader>
          {upload && (
            <div className="grid gap-4">
              <p className="text-sm text-muted-foreground">PDF, DOCX, TXT veya MD yükleyin. Metin parçalara bölünür ve Medi AI bu parçalardan yanıt verir. Aynı isimli doküman tekrar yüklenirse eskisinin yerine geçer.</p>
              <div><Label>Dosya</Label><Input type="file" accept=".pdf,.docx,.txt,.md" onChange={(e) => setUpload({ ...upload, file: e.target.files?.[0] ?? null })} /></div>
              <div><Label>Kategori</Label><Input value={upload.category} onChange={(e) => setUpload({ ...upload, category: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={onImport} disabled={importing || !upload?.file}>{importing ? "İşleniyor…" : "Yükle ve indeksle"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form?.id ? "Maddeyi düzenle" : "Yeni madde"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <div><Label>Başlık</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Kategori</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              </div>
              <div><Label>İçerik</Label><Textarea rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button onClick={onSave} disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
