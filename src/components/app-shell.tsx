import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, Monitor, Image, ListVideo, CalendarClock, Settings, Grid2X2, CreditCard, Shield, Columns2,Plug,Users,Activity,ChevronDown, type LucideIcon } from "lucide-react";
import { usePlatformAdmin } from '@/lib/store';
import markAsset from "@/assets/screenflow-mark.webp.asset.json";
import { ThemeToggle } from '@/components/theme-toggle';
import { SignOutButton } from '@/components/sign-out-button';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarInset, useSidebar,
} from "@/components/ui/sidebar";

type NavEntry =
  | { title: string; url: string; icon: LucideIcon; children?: undefined }
  | { title: string; icon: LucideIcon; children: readonly { title: string; url: string }[]; url?: undefined };

const nav: readonly NavEntry[] = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { title: "Écrans", icon: Monitor, children: [
    { title: "Écrans", url: "/screens" },
    { title: "Groupes", url: "/groups" },
  ] },
  { title: "Supervision", url: "/monitoring", icon: Activity },
  { title: "Murs d’images", url: "/video-walls", icon: Grid2X2 },
  { title: 'Multi-zones',url:'/multi-zones',icon:Columns2 },
  { title: "Médiathèque", url: "/media", icon: Image },
  { title: "Playlists", url: "/playlists", icon: ListVideo },
  { title: "Programmation", url: "/schedule", icon: CalendarClock },
  { title:'Intégrations',url:'/integrations',icon:Plug },
  { title:'Équipe',url:'/team',icon:Users },
  { title: "Paramètres", url: "/settings", icon: Settings },
  { title: 'Abonnement', url: '/subscription', icon: CreditCard },
];

function NavLinks({ currentUrl, onNavigate }: { currentUrl: string | undefined; onNavigate: () => void }) {
  const { setOpenMobile } = useSidebar();
  const { data: isAdmin } = usePlatformAdmin();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const handleClick = () => {
    setOpenMobile(false);
    onNavigate();
  };
  const toggleGroup = (title: string, effectiveOpen: boolean) => setOpenGroups((prev) => ({ ...prev, [title]: !effectiveOpen }));
  return (
    <SidebarMenu className="gap-2">
      {nav.map((item) => {
        if (item.children) {
          const childActive = item.children.some((c) => c.url === currentUrl);
          const open = openGroups[item.title] ?? childActive;
          return (
            <SidebarMenuItem key={item.title}>
              <div className={open ? "rounded-2xl bg-accent p-1.5 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0" : ""}>
                <SidebarMenuButton
                  onClick={() => toggleGroup(item.title, open)}
                  isActive={childActive}
                  tooltip={item.title}
                  aria-expanded={open}
                  aria-label={item.title}
                  className={open ? "text-accent-foreground hover:bg-transparent" : ""}
                >
                  <item.icon />
                  <span>{item.title}</span>
                  <ChevronDown className={`ml-auto transition-transform group-data-[collapsible=icon]:hidden ${open ? "rotate-180" : ""}`} />
                </SidebarMenuButton>
                {open && (
                  <div className="mt-1 flex flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
                    {item.children.map((child) => (
                      <Link
                        key={child.url}
                        to={child.url}
                        onClick={handleClick}
                        aria-current={currentUrl === child.url ? "page" : undefined}
                        className={`block rounded-xl px-4 py-2.5 text-sm font-medium ${currentUrl === child.url ? "bg-card text-foreground shadow-sm" : "bg-card/70 text-foreground/80 hover:bg-card"}`}
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </SidebarMenuItem>
          );
        }
        return (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton asChild isActive={currentUrl === item.url} tooltip={item.title}>
              <Link to={item.url} onClick={handleClick} aria-label={item.title} aria-current={currentUrl === item.url ? "page" : undefined}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
      {isAdmin && <SidebarMenuItem><SidebarMenuButton asChild isActive={currentUrl === '/billing-admin'} tooltip="Administration"><Link to="/billing-admin" onClick={handleClick} aria-label="Administration"><Shield /><span>Administration</span></Link></SidebarMenuButton></SidebarMenuItem>}
    </SidebarMenu>
  );
}

function CloseMobileMenuOnNavigate({ path }: { path: string }) {
  const { setOpenMobile } = useSidebar();
  useEffect(() => {
    setOpenMobile(false);
  }, [path, setOpenMobile]);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuPinned, setMenuPinned] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const flatUrls = nav.flatMap((n) => (n.children ? n.children.map((c) => c.url) : [n.url]));
  const currentUrl = flatUrls.find((u) => (u === "/" ? path === "/" : path.startsWith(u)));
  const closeMenu = () => {
    setMenuPinned(false);
    setMenuHovered(false);
  };
  useEffect(() => {
    closeMenu();
  }, [path]);
  return (
    <SidebarProvider open={menuPinned || menuHovered} onOpenChange={setMenuPinned} className="console-shell bg-sidebar pt-20">
      <header className="fixed inset-x-0 top-0 z-20 flex h-20 items-center justify-between bg-sidebar text-sidebar-foreground px-5 md:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="ScreenFlow — Tableau de bord">
          <img src={markAsset.url} alt="" className="size-8 shrink-0" />
          <span className="font-display text-xl font-medium text-sidebar-foreground">ScreenFlow</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
          <SidebarTrigger aria-label="Ouvrir ou fermer le menu" title="Ouvrir ou fermer le menu" className="size-10" />
        </div>
      </header>
      <Sidebar collapsible="icon"
        onPointerEnter={(event) => { if (event.pointerType === "mouse") setMenuHovered(true); }}
        onPointerLeave={(event) => { if (event.pointerType === "mouse") setMenuHovered(false); }}>
        <SidebarHeader className="md:hidden">
          <div className="flex h-16 items-center gap-3 px-3">
            <img src={markAsset.url} alt="" className="size-8 shrink-0" />
            <span className="font-display text-xl font-medium text-sidebar-foreground group-data-[collapsible=icon]:hidden">ScreenFlow</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-3 pt-4">
            <SidebarGroupContent>
              <NavLinks currentUrl={path === '/billing-admin' ? path : currentUrl} onNavigate={closeMenu} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <p className="px-5 pb-4 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">ScreenFlow · Affichage dynamique</p>
        </SidebarFooter>
      </Sidebar>
      <CloseMobileMenuOnNavigate path={path} />
      <SidebarInset className="min-w-0 md:rounded-tl-3xl">
        <div className="flex-1 p-5 md:px-10 md:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-9 flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-normal md:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: typeof Monitor; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground"><Icon className="size-7" /></div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: "online" | "offline" | "pending" }) {
  const map = {
    online: ["bg-success", "En ligne"],
    offline: ["bg-muted-foreground", "Hors ligne"],
    pending: ["bg-warning", "En attente"],
  } as const;
  const [dot, label] = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium">
      <span className={`size-1.5 rounded-full ${dot}`} />{label}
    </span>
  );
}
