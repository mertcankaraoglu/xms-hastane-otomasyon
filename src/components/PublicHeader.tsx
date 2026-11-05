import { Link } from "@tanstack/react-router";
import { Cross } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HOSPITAL_NAME } from "@/lib/hospital";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Cross className="h-4 w-4" />
          </span>
          {HOSPITAL_NAME}
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/randevu-sorgula">Randevu Sorgula</Link></Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/auth">Personel Girişi</Link></Button>
          <Button asChild size="sm"><Link to="/randevu">Randevu Al</Link></Button>
        </nav>
      </div>
    </header>
  );
}
