import { createFileRoute, Link } from "@tanstack/react-router";
import { Monitor, Wifi, WifiOff, Image, Film, ListVideo, CreditCard } from "lucide-react";
import { PageHeader, EmptyState, StatusBadge } from "@/components/app-shell";
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
    { label: "TV totales", value: screens.length, icon: Monitor, tone: "bg-accent text-accent-foreground" },
    { label: "En ligne", value: screens.filter((s) => s.status === "online").length, icon: Wifi, tone: "bg-success/15 text-success" },
    { label: "Hors ligne", value: screens.filter((s) => s.status !== "online").length, icon: WifiOff, tone: "bg-muted text-muted-foreground" },
    { label: "Photos", value: media.filter((m) => m.type === "image").length, icon: Image, tone: "bg-secondary text-secondary-foreground" },
    { label: "Vidéos", value: media.filter((m) => m.type === "video").length, icon: Film, tone: "bg-warning/15 text-foreground" },
    { label: "Playlists actives", value: playlists.filter((p) => activeIds.has(p.id)).length, icon: ListVideo, tone: "bg-accent text-accent-foreground" },
  ];
  const recent = [...screens].filter((s) => s.lastSeen).sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? "")).slice(0, 5);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Tableau de bord" description="État de votre réseau d'affichage en un coup d'œil." action={<div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/subscription"><CreditCard /> Abonnement</Link></Button><Button asChild><Link to="/screens"><Monitor /> Gérer les écrans</Link></Button></div>} />
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-b pb-9 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label}>
            <div className={`mb-4 flex size-12 items-center justify-center rounded-full ${s.tone}`}><s.icon className="size-6" /></div>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 font-display text-3xl font-normal tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
      <section className="mt-8">
        <h2 className="text-lg font-medium">Écrans récemment connectés</h2>
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
      </section>
    </div>
  );
}
