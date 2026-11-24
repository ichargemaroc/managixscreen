import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Monitor, RefreshCw } from "lucide-react";
import { PageHeader, EmptyState, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/monitoring")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { title: "Supervision — ScreenFlow" },
    { name: "description", content: "Surveillez en direct l'état et la diffusion de toutes vos TV." },
    { property: "og:title", content: "Supervision — ScreenFlow" },
    { property: "og:description", content: "Surveillez en direct l'état et la diffusion de toutes vos TV." },
  ] }),
  component: MonitoringPage,
});

type Filter = "all" | "online" | "offline";
const playbackLabels: Record<string, string> = { playing: "En lecture", paused: "En pause", idle: "Inactif" };

function ago(iso: string | null, now: number) {
  if (!iso) return "Jamais";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
}

function MonitoringPage() {
  const { screens, playlists, media, refresh } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 5000);
    const poll = setInterval(refresh, 30000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [refresh]);
  const online = screens.filter((s) => s.status === "online");
  const alerts = screens.filter((s) => s.status !== "online" && s.lastSeen && now - new Date(s.lastSeen).getTime() > 5 * 60000);
  const shown = screens.filter((s) => filter === "all" || (filter === "online" ? s.status === "online" : s.status !== "online"));
  return (
    <div>
      <PageHeader title="Supervision" description="État en direct de vos TV, actualisé automatiquement toutes les 30 secondes."
        action={<Button variant="outline" onClick={refresh}><RefreshCw /> Actualiser</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">En ligne</p><p className="mt-1 text-3xl text-success">{online.length}<span className="text-base text-muted-foreground"> / {screens.length}</span></p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Hors ligne</p><p className="mt-1 text-3xl">{screens.length - online.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Alertes (+5 min)</p><p className="mt-1 text-3xl text-destructive">{alerts.length}</p></CardContent></Card>
      </div>
      {alerts.length > 0 && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>Sans signal depuis plus de 5 minutes : {alerts.map((s) => s.name).join(", ")}</p>
        </div>
      )}
      <div className="mb-4 flex gap-2">
        {(["all", "online", "offline"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? "Toutes" : f === "online" ? "En ligne" : "Hors ligne"}
          </Button>
        ))}
      </div>
      {screens.length === 0 ? (
        <Card><EmptyState icon={Monitor} title="Aucun écran" text="Ajoutez une TV pour la surveiller ici." /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((s) => {
            const pb = (s.playbackStatus ?? {}) as { state?: string; playlist_id?: string | null; media_id?: string | null };
            const pl = playlists.find((p) => p.id === (pb.playlist_id ?? s.playlistId));
            const md = media.find((m) => m.id === pb.media_id);
            return (
              <Card key={s.id} className={s.status === "online" ? "" : "opacity-80"}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Link to="/screens/$screenId" params={{ screenId: s.id }} className="truncate font-medium hover:underline">{s.name}</Link>
                    <StatusBadge status={s.status} />
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Dernier signal</dt><dd>{ago(s.lastSeen, now)}</dd>
                    <dt className="text-muted-foreground">Synchro</dt><dd>{ago(s.lastSyncAt, now)}</dd>
                    <dt className="text-muted-foreground">Playlist</dt><dd className="truncate">{pl?.name ?? "Aucune"}</dd>
                    <dt className="text-muted-foreground">Média</dt><dd className="truncate">{md?.name ?? "—"}</dd>
                    <dt className="text-muted-foreground">Lecture</dt><dd className="flex items-center gap-1"><Activity className="size-3" />{pb.state ? playbackLabels[pb.state] ?? pb.state : "Inconnue"}</dd>
                    <dt className="text-muted-foreground">Version</dt><dd className="truncate">{s.playerVersion ?? "—"}</dd>
                  </dl>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
