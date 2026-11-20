import { createFileRoute, Link } from "@tanstack/react-router";
import { Monitor, Wifi, WifiOff, Image, Film, ListVideo } from "lucide-react";
import { PageHeader, EmptyState, StatusBadge } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { title: "Tableau de bord — ScreenFlow" },
    { name: "description", content: "Vue d'ensemble de vos écrans, médias et playlists." },
    { property: "og:title", content: "Tableau de bord — ScreenFlow" },
    { property: "og:description", content: "Vue d'ensemble de vos écrans, médias et playlists." },
  ] }),
  component: Dashboard,
});

function Dashboard() {
  const { screens, media, playlists } = useStore();
  const activeIds = new Set(screens.map((s) => s.playlistId).filter(Boolean));
  const stats = [
    { label: "TV totales", value: screens.length, icon: Monitor },
    { label: "En ligne", value: screens.filter((s) => s.status === "online").length, icon: Wifi },
    { label: "Hors ligne", value: screens.filter((s) => s.status !== "online").length, icon: WifiOff },
    { label: "Photos", value: media.filter((m) => m.type === "image").length, icon: Image },
    { label: "Vidéos", value: media.filter((m) => m.type === "video").length, icon: Film },
    { label: "Playlists actives", value: playlists.filter((p) => activeIds.has(p.id)).length, icon: ListVideo },
  ];
  const recent = [...screens].filter((s) => s.lastSeen).sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? "")).slice(0, 5);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Tableau de bord" description="État de votre réseau d'affichage en un coup d'œil." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <s.icon className="size-4 text-primary" />
              <p className="mt-3 font-display text-3xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Écrans récemment connectés</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState icon={Monitor} title="Aucune connexion pour l'instant"
              text="Les écrans apparaîtront ici dès qu'ils se connecteront à ScreenFlow."
              action={<Button asChild><Link to="/screens">Ajouter une TV</Link></Button>} />
          ) : (
            <ul className="divide-y">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <span className="font-medium">{s.name}</span><StatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
