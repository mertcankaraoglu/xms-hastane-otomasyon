import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicHeader } from "@/components/PublicHeader";
import { supabase } from "@/integrations/supabase/client";
import { HOSPITAL_NAME } from "@/lib/hospital";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: `Personel Girişi — ${HOSPITAL_NAME}` },
      { name: "description", content: "Hastane yönetim paneline giriş." },
      { property: "og:title", content: `Personel Girişi — ${HOSPITAL_NAME}` },
      { property: "og:description", content: "Hastane yönetim paneline giriş." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { toast.error("Giriş başarısız: " + error.message); return; }
      navigate({ to: "/panel" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/panel" } });
      setLoading(false);
      if (error) { toast.error(error.message); return; }
      if (data.session) navigate({ to: "/panel" });
      else toast.success("Hesap oluşturuldu. E-postanıza gelen bağlantı ile hesabınızı onaylayın.");
    }
  }

  return (
    <div className="min-h-screen bg-hero">
      <PublicHeader />
      <div className="mx-auto max-w-sm px-4 py-20">
        <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-card p-8 shadow-soft">
          <h1 className="text-2xl font-bold">{mode === "in" ? "Personel Girişi" : "Hesap Oluştur"}</h1>
          <div className="grid gap-1.5"><Label>E-posta</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Şifre</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" disabled={loading}>{mode === "in" ? "Giriş Yap" : "Kayıt Ol"}</Button>
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Hesabınız yok mu? Kayıt olun" : "Zaten hesabınız var mı? Giriş yapın"}
          </button>
          {mode === "up" && <p className="text-xs text-muted-foreground">E-posta onayından sonra hesabınız süper yönetici onayına düşer.</p>}
        </form>
      </div>
    </div>
  );
}
