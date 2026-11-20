import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, Monitor, Image, ListVideo, CalendarClock, FolderTree, Settings } from "lucide-react";
import markAsset from "@/assets/screenflow-mark.png.asset.json";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarInset,
} from "@/components/ui/sidebar";

const nav = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { title: "Écrans", url: "/screens", icon: Monitor },
  { title: "Médiathèque", url: "/media", icon: Image },
  { title: "Playlists", url: "/playlists", icon: ListVideo },
  { title: "Programmation", url: "/schedule", icon: CalendarClock },
  { title: "Groupes", url: "/groups", icon: FolderTree },
  { title: "Paramètres", url: "/settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [menuPinned, setMenuPinned] = useState(false);
  const [menuHovered, setMenuHovered] = useState(false);
  const path = useRouterState({ select: (r) => r.location.pathname });
  const current = nav.find((n) => (n.url === "/" ? path === "/" : path.startsWith(n.url)));
  return (
    <SidebarProvider open={menuPinned || menuHovered} onOpenChange={setMenuPinned} className="console-shell bg-sidebar pt-20">
      <header className="fixed inset-x-0 top-0 z-20 flex h-20 items-center justify-between bg-sidebar px-5 md:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="ScreenFlow — Tableau de bord">
          <img src={markAsset.url} alt="" className="size-8 shrink-0" />
          <span className="font-display text-xl font-medium text-sidebar-foreground">ScreenFlow</span>
        </Link>
        <SidebarTrigger aria-label="Ouvrir ou fermer le menu" title="Ouvrir ou fermer le menu" className="size-10" />
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
              <SidebarMenu className="gap-2">
                {nav.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={current?.url === item.url} tooltip={item.title}>
                      <Link to={item.url} aria-label={item.title} aria-current={current?.url === item.url ? "page" : undefined}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <p className="px-5 pb-4 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">ScreenFlow · Affichage dynamique</p>
        </SidebarFooter>
      </Sidebar>
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
