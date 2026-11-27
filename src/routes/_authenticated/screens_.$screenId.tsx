import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldOff, Trash2, Send, Monitor, Settings2, ListVideo, MapPin, RefreshCw, Save, Film, ImageIcon, Globe, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/app-shell";
import { useStore, updateScreen, deleteScreen, revokeDeviceAccess, sendDeviceCommand, setScreenEnabled, savePlaylistItems, type Screen, type DeviceCommand } from "@/lib/store";
import { COMMAND_LABELS, COMMAND_STATUSES } from "@/lib/player-protocol";
import { sendApkUpdate } from "@/lib/player.functions";
import { DisplayRotationPicker } from '@/components/display-rotation-picker';
import type { DisplayRotation } from '@/lib/display-rotation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { MediaThumbnail } from '@/components/media-thumbnail';
import { PlaylistItemMenu } from '@/components/playlist-item-menu';
import { changePlaylistItem } from '@/lib/playlist-item-actions';

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
  const { groups, playlists, media, commands, refresh } = useStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState(screen.name);
  const [location, setLocation] = useState(screen.location);
  const [rotation, setRotation] = useState<DisplayRotation>(screen.displayRotation ?? 0);
  const [code, setCode] = useState(screen.pairingCode);
  const [playlistId, setPlaylistId] = useState(screen.playlistId ?? "none");
  const [groupId, setGroupId] = useState(screen.groupId ?? "none");
  const [command, setCommand] = useState<DeviceCommand["command"]>("refresh_content");
  const [commandPage, setCommandPage] = useState(1);
  const screenCommands = commands.filter((c) => c.screenId === screen.id);
  const commandPages = Math.max(1, Math.ceil(screenCommands.length / 10));
  const currentCommandPage = Math.min(commandPage, commandPages);
  const commandOffset = (currentCommandPage - 1) * 10;
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(screen.soundEnabled ?? true);
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
  const assignedPlaylist = playlists.find((p) => p.id === screen.playlistId);
  const [itemAction, setItemAction] = useState<{ itemId: string; action: 'up' | 'down' | 'remove' } | null>(null);
  const applyItemAction = async () => {
    if (!assignedPlaylist || !itemAction || busy) return;
    const index = assignedPlaylist.items.findIndex((item) => item.id === itemAction.itemId);
    if (index < 0) { setItemAction(null); return; }
    setBusy(true);
    try {
      const next = changePlaylistItem(assignedPlaylist.items, index, itemAction.action);
      await savePlaylistItems(assignedPlaylist.id, next.map((item) => ({ mediaId: item.mediaId, duration: item.duration })));
      refresh(); setItemAction(null); toast.success('Playlist mise à jour');
    } catch { toast.error('La playlist n’a pas pu être enregistrée'); }
    finally { setBusy(false); }
  };
  const assignedGroup = groups.find((g) => g.id === screen.groupId);
  const dirty = name !== screen.name || location !== screen.location || code !== screen.pairingCode || groupId !== (screen.groupId ?? "none") || playlistId !== (screen.playlistId ?? "none") || rotation !== (screen.displayRotation ?? 0) || sound !== (screen.soundEnabled ?? true);
  const reset = () => { setName(screen.name); setLocation(screen.location); setCode(screen.pairingCode); setGroupId(screen.groupId ?? "none"); setPlaylistId(screen.playlistId ?? "none"); setRotation(screen.displayRotation ?? 0); setSound(screen.soundEnabled ?? true); };
  return <div className="mx-auto max-w-7xl min-w-0">
    <Button asChild variant="ghost" className="mb-4"><Link to="/screens"><ArrowLeft /> Écrans</Link></Button>
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-border pb-6 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="hidden aspect-video w-28 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-accent-foreground sm:flex"><Monitor className="size-12" strokeWidth={1.25} /></div>
        <div className="min-w-0"><h1 className="break-words font-display text-2xl font-semibold">{screen.name}</h1><p className="mt-1 text-sm text-muted-foreground">{screen.revoked ? "Accès révoqué" : screen.deviceId ? "Appareil jumelé" : "En attente de jumelage"}</p>{screen.location && <p className="mt-2 flex min-w-0 items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5 shrink-0" /><span className="truncate">{screen.location}</span></p>}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2"><StatusBadge status={screen.status} /><span className="text-xs text-muted-foreground">{(screen.displayRotation ?? 0) % 180 === 0 ? "Paysage" : "Portrait"} · {screen.displayRotation ?? 0}°</span><Button variant="ghost" size="sm" onClick={refresh} aria-label="Actualiser la TV"><RefreshCw className="size-4" /><span className="hidden sm:inline">Actualiser</span></Button></div>
    </header>
    <div className="grid grid-cols-1 gap-4 border-b border-border py-5 sm:grid-cols-3">
      <div className="min-w-0"><p className="text-xs text-muted-foreground">Dernier signal</p><p className="mt-1 text-sm font-medium">{screen.lastSeen ? new Date(screen.lastSeen).toLocaleString("fr-FR") : "Jamais"}</p></div>
      <div className="min-w-0"><p className="text-xs text-muted-foreground">Groupe</p><p className="mt-1 truncate text-sm font-medium">{assignedGroup?.name ?? "Aucun groupe"}</p></div>
      <div className="min-w-0"><p className="text-xs text-muted-foreground">Playlist par défaut</p><p className="mt-1 truncate text-sm font-medium">{assignedPlaylist?.name ?? "Aucune playlist"}</p></div>
    </div>
    <Tabs defaultValue="content" className="min-w-0">
      <div className="overflow-x-auto border-b border-border"><TabsList className="console-content-tabs" aria-label="Sections de la TV">
        <TabsTrigger value="content"><ListVideo className="mr-2 size-4" />Contenu</TabsTrigger>
        <TabsTrigger value="settings"><Settings2 className="mr-2 size-4" />Paramètres</TabsTrigger>
        <TabsTrigger value="commands"><Send className="mr-2 size-4" />Commandes</TabsTrigger>
        <TabsTrigger value="access"><ShieldOff className="mr-2 size-4" />Accès</TabsTrigger>
      </TabsList></div>
      <TabsContent value="content" className="py-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="min-w-0"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div className="min-w-0"><h2 className="text-lg font-semibold">Playlist par défaut</h2><p className="mt-1 truncate text-sm text-muted-foreground">{assignedPlaylist?.name ?? "Aucune playlist affectée"}</p></div><Button asChild variant="outline" size="sm"><Link to="/playlists"><ExternalLink className="size-4" />Playlists</Link></Button></div>
          {assignedPlaylist?.items.length ? <ol className="mt-5 divide-y divide-border border-y border-border">{assignedPlaylist.items.map((item, index) => {
            const file = media.find((m) => m.id === item.mediaId);
            const Icon = file?.type === "video" ? Film : file?.type === "webpage" ? Globe : ImageIcon;
            return <li key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3"><span className="w-6 text-center text-xs text-muted-foreground">{index + 1}</span><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted">{file ? <MediaThumbnail media={file} /> : <Icon className="size-5 text-muted-foreground" />}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{file?.name ?? "Média indisponible"}</p><p className="text-xs text-muted-foreground">{file?.type === "video" ? "Vidéo" : file?.type === "webpage" ? "Page Web" : "Image"}</p></div></div><div className="flex items-center gap-1"><span className="text-xs tabular-nums text-muted-foreground">{item.duration} s</span><PlaylistItemMenu name={file?.name ?? 'Média indisponible'} first={index === 0} last={index === assignedPlaylist.items.length - 1} disabled={busy} onAction={(action) => setItemAction({ itemId: item.id, action })} /></div></li>;
          })}</ol> : <div className="mt-5 flex flex-col items-center justify-center gap-3 border-y border-border py-12 text-muted-foreground"><ListVideo className="size-9" strokeWidth={1.25} /><p className="text-sm">{assignedPlaylist ? "Cette playlist est vide." : "Aucune playlist affectée à cette TV."}</p></div>}
          </section>
          <section className="min-w-0 lg:border-l lg:border-border lg:pl-8"><h2 className="mb-5 text-lg font-semibold">Informations du lecteur</h2>
    <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
          </section>
        </div>
      </TabsContent>
      <TabsContent value="settings" className="py-6">
    <form className="space-y-6" onSubmit={async (event) => { event.preventDefault(); setBusy(true); try { await updateScreen(screen.id, { name: name.trim(), location: location.trim(), groupId: groupId === "none" ? null : groupId, playlistId: playlistId === "none" ? null : playlistId, displayRotation: rotation, soundEnabled: sound, ...(code !== screen.pairingCode ? { pairingCode: code } : {}) }); refresh(); toast.success("Écran enregistré"); } catch (err) { toast.error(err instanceof Error && err.message ? err.message : "L’enregistrement a échoué"); } finally { setBusy(false); } }}>
      <div className="grid gap-8 lg:grid-cols-2"><section className="min-w-0 space-y-4"><h2 className="text-lg font-semibold">Identité et emplacement</h2>
      <div className="space-y-2"><Label htmlFor="screen-name">Nom</Label><Input id="screen-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="screen-pairing-code">Code d’appairage</Label><Input id="screen-pairing-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} /><p className="text-xs text-muted-foreground">6 chiffres, enregistré sur le serveur et unique parmi vos écrans.</p></div>
      <div className="space-y-2"><Label htmlFor="screen-location">Lieu</Label><Input id="screen-location" maxLength={240} value={location} onChange={(e) => setLocation(e.target.value)} /></div>
      </section><section className="min-w-0 space-y-4 lg:border-l lg:border-border lg:pl-8"><h2 className="text-lg font-semibold">Diffusion</h2>
      <div className="space-y-2"><Label htmlFor="screen-group">Groupe</Label><Select value={groupId} onValueChange={setGroupId}><SelectTrigger id="screen-group" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Aucun groupe</SelectItem>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">La playlist du groupe est appliquée automatiquement à la TV.</p></div>
      <div className="space-y-2"><Label htmlFor="screen-playlist">Playlist affectée</Label><Select value={playlistId} onValueChange={setPlaylistId}><SelectTrigger id="screen-playlist" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Aucune</SelectItem>{playlists.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
      </section></div><section className="border-t border-border pt-4">
      <DisplayRotationPicker value={rotation} onChange={setRotation} disabled={busy} />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-border py-4"><div className="min-w-0"><Label htmlFor="screen-sound">Son de la musique de fond</Label><p className="text-xs text-muted-foreground">La musique est choisie dans la playlist ; ici, vous l’activez ou la coupez sur cette TV.</p></div><Switch id="screen-sound" checked={sound} disabled={busy} onCheckedChange={setSound} /></div>
      </section><div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-border bg-background py-4"><Button type="button" variant="outline" disabled={busy || !dirty} onClick={reset}>Annuler</Button><Button disabled={busy || !dirty || !name.trim() || !/^\d{6}$/.test(code)}><Save />{busy ? "Enregistrement…" : "Enregistrer"}</Button></div>
    </form>
      </TabsContent>
      <TabsContent value="commands" className="py-6">
    <section>
      <h2 className="mb-4 font-display text-lg font-semibold">Commandes du lecteur</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={command} onValueChange={(value) => setCommand(value as DeviceCommand["command"])}><SelectTrigger aria-label="Commande du lecteur" className="w-full sm:flex-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(COMMAND_LABELS).filter(([value]) => value !== 'position_test' && value !== 'stop_position_test' && value !== 'update_apk').map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
        <Button disabled={busy || !screen.deviceId || screen.revoked} onClick={async () => { setBusy(true); try { await sendDeviceCommand(screen.id, command); refresh(); toast.success("Commande mise en attente"); } catch (error) { toast.error(error instanceof Error ? error.message : "Commande refusée"); } finally { setBusy(false); } }}><Send /> Envoyer</Button>
      </div>
      <div className="mt-6 grid grid-cols-1 items-center gap-4 border-y border-border py-5 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><p className="font-medium">Application Android TV</p><p className="text-sm text-muted-foreground">Envoie la dernière version publiée. La TV télécharge l’APK puis affiche l’écran d’installation Android.</p></div><Button variant="outline" disabled={busy || !screen.deviceId || screen.revoked} onClick={async () => { setBusy(true); try { const r = await sendApkUpdate({ data: { screenId: screen.id } }); refresh(); toast.success(`Mise à jour ${r.versionName} envoyée`); } catch (error) { toast.error(error instanceof Error ? error.message : "Mise à jour refusée"); } finally { setBusy(false); } }}>Mettre à jour l’APK</Button></div>
      <ul className="mt-5 divide-y">{screenCommands.slice(commandOffset, commandOffset + 10).map((c) => <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 py-3 text-sm"><div className="min-w-0"><p className="font-medium">{COMMAND_LABELS[c.command]}</p><p className="text-muted-foreground">{new Date(c.createdAt).toLocaleString("fr-FR")}</p>{c.error && <p className="break-words text-destructive">{c.error}</p>}</div><span className="text-muted-foreground">{COMMAND_STATUSES[(c.status === "pending" || c.status === "delivered") && Date.parse(c.expiresAt) <= Date.now() ? "expired" : c.status]}</span></li>)}</ul>
      {screenCommands.length > 0 && <nav aria-label="Pagination des commandes" className="mt-4 grid grid-cols-1 items-center gap-3 border-t border-border pt-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <p className="min-w-0 text-sm text-muted-foreground">{commandOffset + 1}–{Math.min(commandOffset + 10, screenCommands.length)} sur {screenCommands.length} commandes chargées</p>
        <div className="flex shrink-0 items-center gap-3"><Button variant="outline" size="icon" aria-label="Page précédente des commandes" title="Page précédente" disabled={currentCommandPage <= 1} onClick={() => setCommandPage(currentCommandPage - 1)}><ChevronLeft /></Button><span className="min-w-24 text-center text-sm tabular-nums" aria-live="polite">Page {currentCommandPage} / {commandPages}</span><Button variant="outline" size="icon" aria-label="Page suivante des commandes" title="Page suivante" disabled={currentCommandPage >= commandPages} onClick={() => setCommandPage(currentCommandPage + 1)}><ChevronRight /></Button></div>
      </nav>}
      {!commands.some((c) => c.screenId === screen.id) && <p className="mt-4 text-sm text-muted-foreground">Aucune commande envoyée.</p>}
    </section>
      </TabsContent>
      <TabsContent value="access" className="py-6"><h2 className="text-lg font-semibold">Gestion de l’accès</h2>
    <div className="mt-5 grid gap-5 divide-y divide-border">
      <div className="grid grid-cols-1 items-center gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><h3 className="font-medium">{screen.enabled === false ? "Écran désactivé" : "Écran activé"}</h3><p className="mt-1 text-sm text-muted-foreground">Libérez une place sans supprimer la TV ni son jumelage.</p></div>
      <Button variant="outline" disabled={!screen.deviceId || screen.revoked} onClick={() => setConfirm(screen.enabled === false ? 'enable' : 'disable')}>{screen.enabled === false ? 'Réactiver l’écran' : 'Désactiver l’écran'}</Button>
      </div><div className="grid grid-cols-1 items-center gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><h3 className="font-medium">Accès de l’appareil</h3><p className="mt-1 text-sm text-muted-foreground">La révocation nécessite un nouveau jumelage.</p></div><Button variant="outline" disabled={!screen.deviceId || screen.revoked} onClick={() => setConfirm("revoke")}><ShieldOff /> Révoquer l’accès</Button>
      </div><div className="grid grid-cols-1 items-center gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><h3 className="font-medium text-destructive">Supprimer la TV</h3><p className="mt-1 text-sm text-muted-foreground">Retirez définitivement cette TV de votre espace.</p></div><Button variant="outline" className="text-destructive" onClick={() => setConfirm("delete")}><Trash2 /> Supprimer l’écran</Button>
    </div></div>
      </TabsContent>
    </Tabs>
    <Dialog open={itemAction !== null} onOpenChange={(open) => { if (!open && !busy) setItemAction(null); }}><DialogContent>
      <DialogHeader><DialogTitle>{itemAction?.action === 'remove' ? 'Retirer ce média de la playlist ?' : 'Modifier l’ordre de la playlist ?'}</DialogTitle><DialogDescription>Cette modification s’applique à la playlist « {assignedPlaylist?.name} » et à toutes les TV qui la diffusent.{itemAction?.action === 'remove' && ' Le fichier reste dans la médiathèque.'}</DialogDescription></DialogHeader>
      <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setItemAction(null)}>Annuler</Button><Button variant={itemAction?.action === 'remove' ? 'destructive' : 'default'} disabled={busy} onClick={() => void applyItemAction()}>{busy ? 'Enregistrement…' : 'Confirmer'}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open && !busy) setConfirm(null); }}><DialogContent>
      <DialogHeader><DialogTitle>{confirm === 'disable' ? 'Désactiver cet écran ?' : confirm === 'enable' ? 'Réactiver cet écran ?' : confirm === "delete" ? "Supprimer cet écran ?" : "Révoquer l’accès ?"}</DialogTitle><DialogDescription>{confirm === 'disable' ? 'Une place sera libérée et la synchronisation suspendue. Le lecteur mis à jour affichera la désactivation, sans effacer son identité ni son cache. Les anciens APK et les TV hors ligne peuvent conserver la lecture locale.' : confirm === 'enable' ? 'La capacité du forfait sera vérifiée. Aucun nouveau jumelage n’est nécessaire.' : 'L’appareil perdra immédiatement son accès. Un nouveau jumelage sera nécessaire.'}</DialogDescription></DialogHeader>
      <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>Annuler</Button><Button variant="destructive" disabled={busy} onClick={() => void act()}>Confirmer</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}