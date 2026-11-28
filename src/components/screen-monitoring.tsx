import { Link } from "@tanstack/react-router";
import { reportedWebpageFailure } from '@/lib/webpage-diagnostics';
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Eye, Monitor, RefreshCw } from "lucide-react";
import { PageHeader, EmptyState, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WebpagePreview } from "@/components/webpage-preview";
import { useStore, mediaPreviewOptions, type Media } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { parseStorageReport, formatStorageBytes } from '@/lib/device-storage';

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

export function ScreenMonitoring({ showSummary = true }: { showSummary?: boolean }) {
  const { screens, playlists, media, refresh } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [previewScreenId, setPreviewScreenId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 5000);
    const poll = setInterval(refresh, 30000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [refresh]);
  const online = screens.filter((s) => s.status === "online");
  const alerts = screens.filter((s) => s.status !== "online" && s.lastSeen && now - new Date(s.lastSeen).getTime() > 5 * 60000);
  const shown = screens.filter((s) => filter === "all" || (filter === "online" ? s.status === "online" : s.status !== "online"));
  const previewScreen = screens.find((s) => s.id === previewScreenId);
  const reportedMediaId = (previewScreen?.playbackStatus as { media_id?: string | null } | null)?.media_id;
  const previewMedia = media.find((m) => m.id === reportedMediaId);
  return (
    <div>
      {showSummary && <><PageHeader title="Supervision" description="État en direct de vos TV, actualisé automatiquement toutes les 30 secondes."
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
      </>}
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer les téléviseurs">
        {(["all", "online", "offline"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} aria-pressed={filter === f}>
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
            const storage = parseStorageReport(s.deviceInfo);
            const webpageFailure = reportedWebpageFailure(s.playbackStatus);
            return (
              <Card key={s.id} className={s.status === "online" ? "" : "opacity-80"}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Link to="/screens/$screenId" params={{ screenId: s.id }} className="min-w-0 truncate font-medium hover:underline">{s.name}</Link>
                    <div className="shrink-0 whitespace-nowrap"><StatusBadge status={s.status} /></div>
                  </div>
                  <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">Dernier signal</dt><dd>{ago(s.lastSeen, now)}</dd>
                    <dt className="text-muted-foreground">Synchro</dt><dd>{ago(s.lastSyncAt, now)}</dd>
                    <dt className="text-muted-foreground">Playlist</dt><dd className="truncate">{pl?.name ?? "Aucune"}</dd>
                    <dt className="text-muted-foreground">Média</dt><dd className="truncate">{md?.name ?? "—"}</dd>
                    <dt className="text-muted-foreground">Lecture</dt><dd className="flex items-center gap-1"><Activity className="size-3" />{pb.state ? playbackLabels[pb.state] ?? pb.state : "Inconnue"}</dd>
                    {webpageFailure && <><dt className="text-muted-foreground">Page web</dt><dd className="text-destructive">{webpageFailure}</dd></>}
                    <dt className="text-muted-foreground">Version</dt><dd className="truncate">{s.playerVersion ?? "—"}</dd>
                    <dt className="text-muted-foreground">Stockage total</dt><dd>{storage ? formatStorageBytes(storage.storage_total_bytes) : '—'}</dd>
                    <dt className="text-muted-foreground">Stockage disponible</dt><dd>{storage ? formatStorageBytes(storage.storage_available_bytes) : '—'}</dd>
                  </dl>
                  {storage?.storage_source === 'browser' && <p className="text-xs text-muted-foreground">Quota du navigateur, pas la capacité de la TV.</p>}
                  <Button variant="outline" className="w-full" onClick={() => setPreviewScreenId(s.id)} aria-label={`Voir le contenu de ${s.name}`}>
                    <Eye className="size-4" /> Voir le contenu
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {screens.length > 0 && shown.length === 0 && <p role="status" className="py-8 text-center text-sm text-muted-foreground">Aucun téléviseur {filter === "online" ? "en ligne" : "hors ligne"}.</p>}
      <Dialog open={previewScreenId !== null} onOpenChange={(open) => { if (!open) setPreviewScreenId(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader className="min-w-0 pr-6">
            <DialogTitle className="break-words">{previewScreen?.name ?? "Écran indisponible"} — Aperçu</DialogTitle>
            <DialogDescription>Dernier contenu signalé par le lecteur · Pas une capture en direct de la TV.</DialogDescription>
          </DialogHeader>
          {previewScreen && <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <StatusBadge status={previewScreen.status} />
            <span className="text-muted-foreground">Dernier signal : {ago(previewScreen.lastSeen, now)}</span>
          </div>}
          {previewScreen?.status !== "online" && <p role="status" className="text-sm text-destructive">Écran hors ligne : l’aperçu peut ne plus correspondre à son affichage actuel.</p>}
          {previewMedia ? <div key={`${previewScreenId}-${previewMedia.id}`}>
            <MonitoringMediaPreview media={previewMedia} />
            <p className="mt-3 break-words text-sm font-medium">{previewMedia.name}</p>
          </div> : <div className="flex aspect-video items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">
            {reportedMediaId ? "Le média signalé n’est plus disponible dans la médiathèque." : "Le lecteur n’a pas signalé de média individuel. Aperçu indisponible."}
          </div>}
          <div className="flex justify-end"><Button variant="outline" onClick={refresh}><RefreshCw className="size-4" /> Actualiser</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MonitoringMediaPreview({ media }: { media: Media }) {
  const [failed, setFailed] = useState(false);
  const { data: url, isPending, isError } = useQuery(mediaPreviewOptions(media));
  if (isPending) return <div role="status" className="flex aspect-video items-center justify-center bg-muted text-sm text-muted-foreground">Chargement de l’aperçu…</div>;
  if (failed || isError || !url) return <p role="alert" className="bg-muted p-6 text-center text-sm text-muted-foreground">Impossible de charger ce média. Fermez l’aperçu puis actualisez la page pour réessayer.</p>;
  if (media.type === "webpage") return <WebpagePreview url={url} name={media.name} />;
  return <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-muted">
    {media.type === "image" ? <img src={url} alt={media.name} onError={() => setFailed(true)} className="h-full w-full object-contain" /> : <video src={url} controls autoPlay muted playsInline onError={() => setFailed(true)} className="h-full w-full object-contain" />}
  </div>;
}
