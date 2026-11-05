import logo from "@/assets/logo-emblem.png";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Cross } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HOSPITAL_NAME } from "@/lib/hospital";

export function PublicHeader() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <img src={logo} alt="" width={36} height={36} className="h-9 w-9" />
          {HOSPITAL_NAME}
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex"><Link to="/bolumler">Bölümler</Link></Button>
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex"><Link to="/doktorlar">Doktorlarımız</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/randevu-sorgula">Randevu Sorgula</Link></Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">{signedIn ? <Link to="/panel">Panele Git</Link> : <Link to="/auth">Personel Girişi</Link>}</Button>
          <ThemeToggle />
          <Button asChild size="sm"><Link to="/randevu">Randevu Al</Link></Button>
        </nav>
      </div>
    </header>
  );
}
