import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldOff, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PageHeader, StatusBadge } from "@/components/app-shell";
import { useStore, updateScreen, deleteScreen, revokeDeviceAccess, sendDeviceCommand, setScreenEnabled, type Screen, type DeviceCommand } from "@/lib/store";
import { COMMAND_LABELS, COMMAND_STATUSES } from "@/lib/player-protocol";
import { sendApkUpdate } from "@/lib/player.functions";
import { DisplayRotationPicker } from '@/components/display-rotation-picker';
import type { DisplayRotation } from '@/lib/display-rotation';
import { SlideTransitionSelect } from '@/components/slide-transition-select';
import type { SlideTransition } from '@/lib/slide-transition';
import { ScreenMusicPanel } from '@/components/screen-music-panel';

export const Route = createFileRoute("/_authenticated/screens_/$screenId")({
  head: () => ({ meta: [
    { title: "Détails de l’écran — ScreenFlow" },
    { name: "description", content: "Connexion, emplacement et accès de votre appareil Android TV." },
    { property: "og:title", content: "Détails de l’écran — ScreenFlow" },
    { property: "og:description", content: "Gérez l’identité et la connexion de votre appareil." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ScreenDetails,
});

function ScreenDetails() {
  const { screenId } = Route.useParams();
  const { screens } = useStore();
  const screen = screens.find((s) => s.id === screenId);
  if (!screen) return <div><Button asChild variant="ghost"><Link to="/screens"><ArrowLeft /> Écrans</Link></Button><p className="mt-6">Écran introuvable ou accès non autorisé.</p></div>;
  return <Details key={screen.id} screen={screen} />;
}

function Details({ screen }: { screen: Screen }) {
  const { groups, playlists, commands, refresh } = useStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState(screen.name);
  const [location, setLocation] = useState(screen.location);
  const [rotation, setRotation] = useState<DisplayRotation>(screen.displayRotation ?? 0);
  const [transition, setTransition] = useState<SlideTransition>(screen.slideTransition ?? 'default');
  const [playlistId, setPlaylistId] = useState(screen.playlistId ?? "none");
  const [command, setCommand] = useState<DeviceCommand["command"]>("refresh_content");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"revoke" | "delete" | 'disable' | 'enable' | null>(null);
  const act = async () => {
    setBusy(true);
    try {
      if (confirm === "delete") { await deleteScreen(screen.id); refresh(); await navigate({ to: "/screens" }); }
      else if (confirm === 'disable' || confirm === 'enable') { await setScreenEnabled(screen.id, confirm === 'enable'); refresh(); toast.success(confirm === 'enable' ? 'Écran réactivé' : 'Écran désactivé, place libérée'); }
      else { await revokeDeviceAccess(screen.id); refresh(); toast.success("Accès de l’appareil révoqué"); }
      void queryClient.invalidateQueries({ queryKey: ['billing-account'] });
      setConfirm(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "La modification a échoué"); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-3xl">
    <Button asChild variant="ghost" className="mb-4"><Link to="/screens"><ArrowLeft /> Écrans</Link></Button>
    <PageHeader title={screen.name} description={screen.revoked ? "Accès révoqué" : screen.deviceId ? "Appareil jumelé" : "En attente de jumelage"} />
    <dl className="mb-8 grid grid-cols-1 gap-5 border-y py-6 sm:grid-cols-2">
      <div><dt className="text-sm text-muted-foreground">Connexion</dt><dd className="mt-2"><StatusBadge status={screen.status} /></dd></div>
      <div><dt className="text-sm text-muted-foreground">Dernière connexion</dt><dd className="mt-2">{screen.lastSeen ? new Date(screen.lastSeen).toLocaleString("fr-FR") : "Jamais"}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Groupe</dt><dd>{groups.find((g) => g.id === screen.groupId)?.name || "Aucun"}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Playlist affectée</dt><dd>{playlists.find((p) => p.id === screen.playlistId)?.name || "Aucune"}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Dernière demande de synchronisation</dt><dd>{screen.lastSyncAt ? new Date(screen.lastSyncAt).toLocaleString("fr-FR") : "Jamais"}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Version du lecteur</dt><dd>{screen.playerVersion || "Non communiquée"}</dd></div>
      {screen.deviceInfo !== null && typeof screen.deviceInfo === "object" && "model" in screen.deviceInfo && <div><dt className="text-sm text-muted-foreground">Modèle</dt><dd className="break-words">{String(screen.deviceInfo.model)}</dd></div>}
      {screen.playbackStatus !== null && typeof screen.playbackStatus === "object" && "state" in screen.playbackStatus && <div><dt className="text-sm text-muted-foreground">Lecture déclarée</dt><dd>{({ idle: "Inactive", playing: "En lecture", paused: "En pause", buffering: "Chargement", error: "Erreur" } as Record<string, string>)[String(screen.playbackStatus.state)] ?? "Non communiquée"}</dd></div>}
      {screen.deviceId && <div className="sm:col-span-2"><dt className="text-sm text-muted-foreground">Identifiant de l’appareil</dt><dd className="break-all text-sm">{screen.deviceId}</dd></div>}
    </dl>
    <form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { await updateScreen(screen.id, { name: name.trim(), location: location.trim(), playlistId: playlistId === "none" ? null : playlistId, displayRotation: rotation, slideTransition: transition }); refresh(); toast.success("Écran enregistré"); } catch { toast.error("L’enregistrement a échoué"); } finally { setBusy(false); } }}>
      <div className="space-y-2"><Label htmlFor="screen-name">Nom</Label><Input id="screen-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="screen-location">Lieu</Label><Input id="screen-location" maxLength={240} value={location} onChange={(e) => setLocation(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="screen-playlist">Playlist affectée</Label><Select value={playlistId} onValueChange={setPlaylistId}><SelectTrigger id="screen-playlist" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Aucune</SelectItem>{playlists.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
      <DisplayRotationPicker value={rotation} onChange={setRotation} disabled={busy} />
      <SlideTransitionSelect value={transition} onChange={setTransition} disabled={busy} />
      <Button disabled={busy || !name.trim()}>Enregistrer</Button>
    </form>
    <ScreenMusicPanel screenId={screen.id} />
    <section className="mt-8 border-t pt-6">
      <h2 className="mb-4 font-display text-lg font-semibold">Commandes du lecteur</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={command} onValueChange={(value) => setCommand(value as DeviceCommand["command"])}><SelectTrigger aria-label="Commande du lecteur" className="w-full sm:flex-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(COMMAND_LABELS).filter(([value]) => value !== 'position_test' && value !== 'stop_position_test' && value !== 'update_apk').map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
        <Button disabled={busy || !screen.deviceId || screen.revoked} onClick={async () => { setBusy(true); try { await sendDeviceCommand(screen.id, command); refresh(); toast.success("Commande mise en attente"); } catch (error) { toast.error(error instanceof Error ? error.message : "Commande refusée"); } finally { setBusy(false); } }}><Send /> Envoyer</Button>
      </div>
      <div className="mt-4 flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Application Android TV</p><p className="text-sm text-muted-foreground">Envoie la dernière version publiée. La TV télécharge l’APK puis affiche l’écran d’installation Android.</p></div><Button variant="outline" disabled={busy || !screen.deviceId || screen.revoked} onClick={async () => { setBusy(true); try { const r = await sendApkUpdate({ data: { screenId: screen.id } }); refresh(); toast.success(`Mise à jour ${r.versionName} envoyée`); } catch (error) { toast.error(error instanceof Error ? error.message : "Mise à jour refusée"); } finally { setBusy(false); } }}>Mettre à jour l’APK</Button></div>
      <ul className="mt-5 divide-y">{commands.filter((c) => c.screenId === screen.id).slice(0, 30).map((c) => <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm"><div><p className="font-medium">{COMMAND_LABELS[c.command]}</p><p className="text-muted-foreground">{new Date(c.createdAt).toLocaleString("fr-FR")}</p>{c.error && <p className="break-words text-destructive">{c.error}</p>}</div><span className="text-muted-foreground">{COMMAND_STATUSES[(c.status === "pending" || c.status === "delivered") && Date.parse(c.expiresAt) <= Date.now() ? "expired" : c.status]}</span></li>)}</ul>
      {!commands.some((c) => c.screenId === screen.id) && <p className="mt-4 text-sm text-muted-foreground">Aucune commande envoyée.</p>}
    </section>
    <div className="mt-8 flex flex-wrap gap-3 border-t pt-6">
      <Button variant="outline" disabled={!screen.deviceId || screen.revoked} onClick={() => setConfirm(screen.enabled === false ? 'enable' : 'disable')}>{screen.enabled === false ? 'Réactiver l’écran' : 'Désactiver l’écran'}</Button>
      <Button variant="outline" disabled={!screen.deviceId || screen.revoked} onClick={() => setConfirm("revoke")}><ShieldOff /> Révoquer l’accès</Button>
      <Button variant="outline" className="text-destructive" onClick={() => setConfirm("delete")}><Trash2 /> Supprimer l’écran</Button>
    </div>
    <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open && !busy) setConfirm(null); }}><DialogContent>
      <DialogHeader><DialogTitle>{confirm === 'disable' ? 'Désactiver cet écran ?' : confirm === 'enable' ? 'Réactiver cet écran ?' : confirm === "delete" ? "Supprimer cet écran ?" : "Révoquer l’accès ?"}</DialogTitle><DialogDescription>{confirm === 'disable' ? 'Une place sera libérée et la synchronisation suspendue. Le lecteur mis à jour affichera la désactivation, sans effacer son identité ni son cache. Les anciens APK et les TV hors ligne peuvent conserver la lecture locale.' : confirm === 'enable' ? 'La capacité du forfait sera vérifiée. Aucun nouveau jumelage n’est nécessaire.' : 'L’appareil perdra immédiatement son accès. Un nouveau jumelage sera nécessaire.'}</DialogDescription></DialogHeader>
      <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>Annuler</Button><Button variant="destructive" disabled={busy} onClick={() => void act()}>Confirmer</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}