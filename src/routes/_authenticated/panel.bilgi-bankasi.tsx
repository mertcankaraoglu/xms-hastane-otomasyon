import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { reindexKb, saveKbArticle } from "@/lib/medi-ai.functions";

export const Route = createFileRoute("/_authenticated/panel/bilgi-bankasi")({
  head: () => ({ meta: [{ title: "Bilgi Bankası — Yönetim Paneli" }, { name: "description", content: "Medi AI bilgi bankası" }, { property: "og:title", content: "Bilgi Bankası" }, { property: "og:description", content: "Medi AI bilgi bankası" }] }),
  component: KbPage,
});

type Form = { id: string | null; title: string; category: string; content: string };
const kbQuery = { queryKey: ["kb"], queryFn: async () => {
  const { data, error } = await supabase.from("kb_articles").select("id, title, category, content, sort_order, embedding").order("sort_order").order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, indexed: !!r.embedding, embedding: undefined }));
} };

function KbPage() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery(kbQuery);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const save = useServerFn(saveKbArticle);
  const reindex = useServerFn(reindexKb);

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
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bilgi Bankası</h1>
          <p className="text-sm text-muted-foreground">Medi AI asistanı hastane hakkındaki soruları bu maddelere göre yanıtlar.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReindex} disabled={reindexing}><RefreshCw className={`h-4 w-4 ${reindexing ? "animate-spin" : ""}`} /> Yeniden indeksle{missing ? ` (${missing})` : ""}</Button>
          <Button onClick={() => setForm({ id: null, title: "", category: "Genel", content: "" })}><Plus className="h-4 w-4" /> Yeni madde</Button>
        </div>
      </div>
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{r.title} <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{r.category}</span>
                  {!r.indexed && <span className="ml-2 text-xs text-destructive">indekslenmedi</span>}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.content}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => setForm({ id: r.id, title: r.title, category: r.category, content: r.content })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
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
