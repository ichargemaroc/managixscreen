import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, Monitor, Image, ListVideo, CalendarClock, Settings, Grid2X2, CreditCard, Shield, Columns2,Plug,Users,Activity,ChevronDown,FolderTree,Plus, type LucideIcon } from "lucide-react";
import { usePlatformAdmin, useStore } from '@/lib/store';
import markAsset from "@/assets/screenflow-mark.webp.asset.json";
import { ThemeToggle } from '@/components/theme-toggle';
import { SignOutButton } from '@/components/sign-out-button';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarInset, useSidebar,
} from "@/components/ui/sidebar";

type NavEntry =
  | { title: string; url: string; icon: LucideIcon; children?: undefined; showScreens?: undefined }
  | { title: string; icon: LucideIcon; children: readonly { title: string; url: string }[]; url?: undefined; showScreens?: boolean };

const nav: readonly NavEntry[] = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { title: "Écrans", icon: Monitor, showScreens: true, children: [
    { title: "Écrans", url: "/screens" },
    { title: "Groupes", url: "/groups" },
  ] },
  { title: "Supervision", url: "/monitoring", icon: Activity },
  { title: "Playlists", url: "/playlists", icon: ListVideo },
  { title: "Médiathèque", url: "/media", icon: Image },
  { title: "Programmation", url: "/schedule", icon: CalendarClock },
  { title: 'Multi-zones',url:'/multi-zones',icon:Columns2 },
  { title: "Murs d’images", url: "/video-walls", icon: Grid2X2 },
  { title:'Intégrations',url:'/integrations',icon:Plug },
  { title:'Équipe',url:'/team',icon:Users },
  { title: "Paramètres", url: "/settings", icon: Settings },
  { title: 'Abonnement', url: '/subscription', icon: CreditCard },
];

export function NavLinks({ currentUrl, path, onNavigate }: { currentUrl: string | undefined; path: string; onNavigate: () => void }) {
  const { setOpenMobile } = useSidebar();
  const { data: isAdmin } = usePlatformAdmin();
  const { screens, groups } = useStore();
  const search = useRouterState({ select: (r) => r.location.search as { g?: string } });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openList, setOpenList] = useState<'tv' | 'groups' | null>(null);
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
                <div className="relative" onPointerEnter={() => setOpenGroups((prev) => (prev[item.title] === false ? prev : { ...prev, [item.title]: true }))}>
                  <SidebarMenuButton
                    isActive={childActive}
                    tooltip={item.title}
                    onClick={() => toggleGroup(item.title, open)}
                    aria-label={item.title}
                    aria-expanded={open}
                    className={open ? "text-accent-foreground hover:bg-transparent" : ""}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </div>
                {open && (
                  <div className="mt-1 flex flex-col gap-1.5 group-data-[collapsible=icon]:hidden">
                    {item.showScreens && (
                      <div className="overflow-hidden rounded-xl bg-card/70">
                        <button
                          type="button"
                          onClick={() => setOpenList((v) => (v === 'tv' ? null : 'tv'))}
                          aria-expanded={openList === 'tv'}
                          aria-label={openList === 'tv' ? "Replier la liste des téléviseurs" : "Déplier la liste des téléviseurs"}
                          className="flex h-10 w-full items-center gap-2 px-4 text-sm font-medium text-foreground/80 hover:bg-card"
                        >
                          <span className="truncate">Téléviseurs</span>
                          <ChevronDown className={`ml-auto size-4 shrink-0 transition-transform ${openList === 'tv' ? "rotate-180" : ""}`} />
                        </button>
                        {openList === 'tv' && (
                        <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto pb-1">
                        <Link
                          to="/screens"
                          search={{ new: "1" }}
                          onClick={handleClick}
                          className="flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium text-foreground/70 hover:bg-card"
                        >
                          <Plus className="size-3.5 shrink-0 opacity-70" />
                          <span className="truncate">Ajouter une TV</span>
                        </Link>
                        {screens.map((screen) => {
                          const url = `/screens/${screen.id}`;
                          const active = path === url;
                          return (
                            <Link
                              key={screen.id}
                              to="/screens/$screenId"
                              params={{ screenId: screen.id }}
                              onClick={handleClick}
                              aria-current={active ? "page" : undefined}
                              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium ${active ? "bg-card text-foreground shadow-sm" : "text-foreground/70 hover:bg-card"}`}
                            >
                              <Monitor className="size-3.5 shrink-0 opacity-70" />
                              <span className="truncate">{screen.name}</span>
                            </Link>
                          );
                        })}
                        </div>
                        )}
                      </div>
                    )}
                    {(item.showScreens ? [] : item.children).map((child) => (
                      <Link
                        key={child.url}
                        to={child.url}
                        onClick={handleClick}
                        aria-current={currentUrl === child.url ? "page" : undefined}
                        className={`flex h-10 items-center rounded-xl px-4 text-sm font-medium ${currentUrl === child.url ? "bg-card text-foreground shadow-sm" : "bg-card/70 text-foreground/80 hover:bg-card"}`}
                      >
                        {child.title}
                      </Link>
                    ))}
                    {item.showScreens && (
                      <div className="overflow-hidden rounded-xl bg-card/70">
                        <div className="relative">
                          <Link
                            to="/groups"
                            onClick={() => setOpenList('groups')}
                            aria-current={path === "/groups" && !search.g ? "page" : undefined}
                            className="flex h-10 w-full items-center gap-2 px-4 text-sm font-medium text-foreground/80 hover:bg-card"
                          >
                            <span className="truncate">Groupes</span>
                            <ChevronDown className={`ml-auto size-4 shrink-0 transition-transform ${openList === 'groups' ? "rotate-180" : ""}`} />
                          </Link>
                          {/* Invisible toggle: keeps the group list collapsible without adding a second arrow. */}
                          <button
                            type="button"
                            onClick={() => setOpenList((v) => (v === 'groups' ? null : 'groups'))}
                            aria-expanded={openList === 'groups'}
                            aria-label={openList === 'groups' ? "Replier la liste des groupes" : "Déplier la liste des groupes"}
                            className="absolute inset-y-0 right-0 w-9"
                          />
                        </div>
                        {openList === 'groups' && (
                        <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto pb-1">
                        <Link
                          to="/groups"
                          search={{ new: "1" }}
                          onClick={handleClick}
                          className="flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium text-foreground/70 hover:bg-card"
                        >
                          <Plus className="size-3.5 shrink-0 opacity-70" />
                          <span className="truncate">Nouveau groupe</span>
                        </Link>
                        {groups.map((group) => {
                          const active = path === `/groups/${group.id}`;
                          return (
                            <Link
                              key={group.id}
                              to="/groups/$groupId"
                              params={{ groupId: group.id }}
                              onClick={handleClick}
                              aria-current={active ? "page" : undefined}
                              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium ${active ? "bg-card text-foreground shadow-sm" : "text-foreground/70 hover:bg-card"}`}
                            >
                              <FolderTree className="size-3.5 shrink-0 opacity-70" />
                              <span className="truncate">{group.name}</span>
                            </Link>
                          );
                        })}
                        </div>
                        )}
                      </div>
                    )}
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
  // A pinned menu (opened with the header button) must survive navigation; only the
  // hover-opened preview closes when the pointer leaves or a link is clicked.
  const closeMenu = () => setMenuHovered(false);
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
              <NavLinks currentUrl={path === '/billing-admin' ? path : currentUrl} path={path} onNavigate={closeMenu} />
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
