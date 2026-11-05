import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable/index";
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/panel" }); });
  }, [navigate]);

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) { toast.error("Google ile giriş başarısız"); return; }
    if (result.redirected) return;
    navigate({ to: "/panel" });
  }

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
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />veya<div className="h-px flex-1 bg-border" /></div>
          <button type="button" onClick={google} className="inline-flex h-10 items-center justify-center gap-[10px] rounded-md border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F]">
            <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
            {mode === "in" ? "Google ile giriş yap" : "Google ile kayıt ol"}
          </button>
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Hesabınız yok mu? Kayıt olun" : "Zaten hesabınız var mı? Giriş yapın"}
          </button>
          {mode === "up" && <p className="text-xs text-muted-foreground">E-posta onayından sonra hesabınız süper yönetici onayına düşer.</p>}
        </form>
      </div>
    </div>
  );
}
