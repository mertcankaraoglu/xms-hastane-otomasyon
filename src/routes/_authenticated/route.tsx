import logo from "@/assets/logo-emblem.png";
import { createFileRoute, redirect, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, LayoutDashboard, LogOut, Settings, Stethoscope, Users, Building2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { HOSPITAL_NAME } from "@/lib/hospital";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role, active").eq("user_id", data.user.id);
    const rows = roles ?? [];
    const inactive = rows.length > 0 && rows.every((r) => !r.active && r.role !== "superadmin");
    return { user: data.user, inactive, roles: rows.filter((r) => r.active || r.role === "superadmin").map((r) => r.role) };
  },
  component: Layout,
});

const nav = [
  { to: "/panel", label: "Dashboard", icon: LayoutDashboard },
  { to: "/panel/takvim", label: "Takvim", icon: CalendarDays },
  { to: "/panel/randevular", label: "Randevular", icon: ClipboardList },
  { to: "/panel/hastalar", label: "Hastalar", icon: Users },
  { to: "/panel/departmanlar", label: "Departmanlar", icon: Building2 },
  { to: "/panel/doktorlar", label: "Doktorlar", icon: Stethoscope },
  { to: "/panel/ayarlar", label: "Ayarlar", icon: Settings },
] as const;

function Layout() {
  const { user, roles, inactive } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isSuper = roles.includes("superadmin");
  const items = nav.filter((n) => n.to !== "/panel/ayarlar" || isSuper);
  if (roles.length === 0) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold">{inactive ? "Hesabınız pasif" : "Admin onayı bekleniyor"}</h1>
          <p className="mt-2 text-muted-foreground">{inactive ? `${user.email} hesabınız süper yönetici tarafından pasife alındı.` : `${user.email} hesabınız oluşturuldu. Süper yönetici onayladıktan sonra panele erişebilirsiniz.`}</p>
          <Button className="mt-6 mr-2" onClick={() => window.location.reload()}>Tekrar kontrol et</Button>
          <Button className="mt-6" variant="outline" onClick={signOut}>Çıkış yap</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <Link to="/" className="flex items-center gap-2 px-5 py-5 font-display font-semibold text-sidebar-accent-foreground">
          <img src={logo} alt="" width={36} height={36} className="h-9 w-9" />
          {HOSPITAL_NAME}
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/panel" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs">
          <p className="truncate">{user.email}</p>
          <p className="text-sidebar-primary">{isSuper ? "Süper yönetici" : roles.includes("admin") ? "Yönetici" : "Resepsiyon"}</p>
          <div className="mt-3 flex items-center justify-between"><button onClick={signOut} className="flex items-center gap-2 hover:text-sidebar-accent-foreground"><LogOut className="h-3.5 w-3.5" /> Çıkış</button><ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" /></div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex gap-1 overflow-x-auto border-b bg-sidebar p-2 md:hidden">
          {items.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/panel" }} className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-sidebar-foreground" activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}>{n.label}</Link>
          ))}
        </div>
        <main className="flex-1 p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
