import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/hospital";

export const Route = createFileRoute("/_authenticated/panel/hastalar/")({
  head: () => ({ meta: [{ title: "Hastalar — Yönetim Paneli" }, { name: "description", content: "Hasta listesi" }, { property: "og:title", content: "Hastalar" }, { property: "og:description", content: "Hasta listesi" }] }),
  component: PatientsPage,
});

function PatientsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ full_name: "", tc_no: "", phone: "", email: "", birth_date: "" });

  const { data = [] } = useQuery({
    queryKey: ["patients", q],
    queryFn: async () => {
      let qb = supabase.from("patients").select("*, appointments(count)").order("created_at", { ascending: false }).limit(200);
      if (q.length >= 2) qb = qb.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,tc_no.ilike.%${q}%`);
      const { data, error } = await qb;
      if (error) throw error;
      return data;
    },
  });

  async function create() {
    if (f.full_name.trim().length < 3 || f.phone.trim().length < 10) { toast.error("Ad ve telefon zorunlu"); return; }
    const { error } = await supabase.from("patients").insert({
      full_name: f.full_name.trim(), tc_no: f.tc_no.trim() || null, phone: f.phone.trim(), email: f.email.trim() || null, birth_date: f.birth_date || null,
    });
    if (error) { toast.error(error.code === "23505" ? "Bu TC ile kayıtlı hasta var" : error.message); return; }
    toast.success("Hasta eklendi");
    setOpen(false); setF({ full_name: "", tc_no: "", phone: "", email: "", birth_date: "" });
    qc.invalidateQueries({ queryKey: ["patients"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hastalar</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Yeni Hasta</Button>
      </div>
      <Input className="max-w-sm" placeholder="Ad, telefon veya TC ile ara" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Ad Soyad</TableHead><TableHead>TC</TableHead><TableHead>Telefon</TableHead><TableHead>Randevu</TableHead><TableHead>Kayıt</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.map((p) => (
              <TableRow key={p.id}>
                <TableCell><Link to="/panel/hastalar/$id" params={{ id: p.id }} className="font-medium hover:text-primary">{p.full_name}</Link></TableCell>
                <TableCell className="font-mono text-xs">{p.tc_no ?? "—"}</TableCell>
                <TableCell>{p.phone}</TableCell>
                <TableCell>{(p.appointments as unknown as { count: number }[])[0]?.count ?? 0}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{fmtDate(p.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Yeni Hasta</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            {([["full_name", "Ad Soyad *"], ["tc_no", "TC Kimlik No"], ["phone", "Telefon *"], ["email", "E-posta"]] as const).map(([k, l]) => (
              <div key={k} className="grid gap-1.5"><Label>{l}</Label><Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
            ))}
            <div className="grid gap-1.5"><Label>Doğum Tarihi</Label><Input type="date" value={f.birth_date} onChange={(e) => setF({ ...f, birth_date: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={create}>Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
