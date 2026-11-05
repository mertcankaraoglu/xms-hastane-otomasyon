import logo from "@/assets/logo-emblem.png";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HOSPITAL_NAME, iconFor } from "@/lib/hospital";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { listDepartmentsPublic } from "@/lib/public-content.functions";

export function PublicHeader() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  const { data: depts = [] } = useQuery({ queryKey: ["public-departments-menu"], queryFn: () => listDepartmentsPublic(), staleTime: 300_000 });
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <img src={logo} alt="" width={36} height={36} className="h-9 w-9" />
          {HOSPITAL_NAME}
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden md:inline-flex">Bölümler <ChevronDown className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {depts.map((d) => {
                const Icon = iconFor(d.icon);
                return (
                  <DropdownMenuItem key={d.id} asChild>
                    <Link to="/bolumler/$slug" params={{ slug: d.slug }} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-soft text-primary"><Icon className="h-4 w-4" /></span>
                      {d.name}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/bolumler" className="flex items-center gap-3 font-medium"><LayoutGrid className="h-4 w-4" /> Tüm bölümler</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
