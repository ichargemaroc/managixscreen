import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ListVideo, Plus, GripVertical, Trash2, Film, ArrowLeft, Globe, Users, MonitorPlay } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { resolveAssignmentTargets, resolvePlaylistAudience } from "@/lib/assignment-targets";
import { PlaylistMusicPanel } from "@/components/screen-music-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, formatDuration, createPlaylist, renamePlaylist, deletePlaylist, savePlaylistItems, assignPlaylistMany, type Playlist, type PlaylistItem } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/playlists")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { title: "Playlists — ScreenFlow" },
    { name: "description", content: "Composez vos playlists et affectez-les à vos écrans." },
    { property: "og:title", content: "Playlists — ScreenFlow" },
    { property: "og:description", content: "Composez vos playlists et affectez-les à vos écrans." },
  ] }),
  component: Playlists,
});

function Playlists() {
  const { playlists, media, refresh } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = playlists.find((p) => p.id === openId);
  const create = async () => {
    const id = await createPlaylist(`Nouvelle playlist ${playlists.length + 1}`);
    refresh();
    setOpenId(id);
  };
  if (open) return <Editor playlist={open} onBack={() => setOpenId(null)} />;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Playlists" description="Séquences de contenus diffusées sur vos écrans." action={<Button onClick={create}><Plus /> Nouvelle playlist</Button>} />
      {playlists.length === 0 ? (
        <EmptyState icon={ListVideo} title="Aucune playlist" text="Créez une playlist puis ajoutez-y des photos et vidéos de votre bibliothèque." action={<Button onClick={create}><Plus /> Créer une playlist</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {playlists.map((p) => {
            const total = p.items.reduce((a, i) => a + i.duration, 0);
            const first = media.find((m) => m.id === p.items[0]?.mediaId);
            return (
              <Card key={p.id} className="cursor-pointer overflow-hidden p-0 transition hover:shadow-md" onClick={() => setOpenId(p.id)}>
                <div className="flex aspect-video items-center justify-center bg-muted">{first && (first.type === 'webpage' ? <Globe className="size-12 text-primary" /> : first.type === "image" ? <img src={first.url} alt="" className="size-full object-cover" /> : <video src={first.url} muted className="size-full object-cover" />)}</div>
                <CardContent className="p-4"><p className="font-semibold">{p.name}</p><p className="text-xs text-muted-foreground">{p.items.length} élément(s) · {formatDuration(total)}</p></CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Editor({ playlist, onBack }: { playlist: Playlist; onBack: () => void }) {
  const { media, screens, groups, refresh } = useStore();
  const [drag, setDrag] = useState<number | null>(null);
  const [pickedScreens, setPickedScreens] = useState<string[]>([]);
  const [pickedGroups, setPickedGroups] = useState<string[]>([]);
  const audience = resolvePlaylistAudience(groups, screens, playlist.id);
  const assignedGroupIds = audience.groups.map((g) => g.id);
  const audienceScreenIds = [...audience.directScreens, ...audience.inheritedScreens].map((s) => s.id);
  const resolved = resolveAssignmentTargets(screens, pickedScreens, [...pickedGroups, ...assignedGroupIds]);
  const toggle = (list: string[], id: string, on: boolean) => on ? [...list, id] : list.filter((x) => x !== id);
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<PlaylistItem[]>(playlist.items);
  const persist = async (next: PlaylistItem[]) => {
    if (busy) return;
    setBusy(true);
    try {
      await savePlaylistItems(playlist.id, next.map((it) => ({ mediaId: it.mediaId, duration: it.duration })));
      setItems(next); refresh();
    } catch { toast.error("La playlist n’a pas pu être enregistrée"); } finally { setBusy(false); }
  };
  const add = (mediaId: string) => {
    const m = media.find((x) => x.id === mediaId);
    if (!m) return;
    void persist([...items, { id: crypto.randomUUID(), mediaId, duration: m.type === "image" ? 10 : Math.round(m.duration ?? 10) }]);
  };
  const move = (from: number, to: number) => {
    const next = [...items]; const [x] = next.splice(from, 1); if (x) next.splice(to, 0, x);
    void persist(next);
  };
  const assign = async () => {
    const count = await assignPlaylistMany(playlist.id, resolved.groupIds, resolved.screenIds);
    setPickedScreens([]); setPickedGroups([]);
    refresh();
    toast.success(`Playlist affectée à ${count} TV`);
  };
  const remove = async () => {
    await deletePlaylist(playlist.id);
    refresh();
    onBack();
  };
  return (
    <div className="mx-auto max-w-7xl">
      <Button variant="ghost" size="sm" className="mb-4" onClick={onBack}><ArrowLeft /> Playlists</Button>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input className="max-w-md font-display text-xl font-semibold" aria-label="Nom de la playlist" value={name} onChange={(e) => setName(e.target.value)} />
        <Button variant="outline" className="text-destructive" onClick={() => void remove()}><Trash2 /> Supprimer</Button>
      </div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row"><Input aria-label="Description de la playlist" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} /><Button disabled={!name.trim()} onClick={async () => { try { await renamePlaylist(playlist.id, name.trim(), description); refresh(); toast.success("Playlist enregistrée"); } catch { toast.error("L’enregistrement a échoué"); } }}>Enregistrer</Button></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card><CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Ordre de diffusion</h2>
          {items.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Ajoutez des médias depuis la colonne de droite.</p> : (
            <ul className="space-y-2">
              {items.map((it, i) => {
                const m = media.find((x) => x.id === it.mediaId); if (!m) return null;
                return (
                  <li key={it.id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null && drag !== i) move(drag, i); setDrag(null); }}
                    className={`flex items-center gap-3 rounded-lg border bg-card p-2 ${drag === i ? "opacity-50" : ""}`}>
                    <GripVertical className="size-4 cursor-grab text-muted-foreground" />
                    <div className="flex h-10 w-16 items-center justify-center overflow-hidden rounded bg-muted">{m.type === 'webpage' ? <Globe className="text-primary" /> : m.type === "image" ? <img src={m.url} alt="" className="size-full object-cover" /> : <video src={m.url} muted className="size-full object-cover" />}</div>
                    <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                    {m.type !== "video" ? (
                      <div className="flex items-center gap-1"><Input type="number" min={1} className="h-8 w-16" value={it.duration} onChange={(e) => void persist(items.map((x) => (x.id === it.id ? { ...x, duration: Math.max(1, Number(e.target.value) || 1) } : x)))} /><span className="text-xs text-muted-foreground">s</span></div>
                    ) : <span className="text-xs text-muted-foreground">{formatDuration(m.duration)}</span>}
                    <Button variant="ghost" size="icon" aria-label="Retirer" onClick={() => void persist(items.filter((x) => x.id !== it.id))}><Trash2 /></Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent></Card>
        <div className="space-y-6">
          <Card><CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Diffusée sur</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{audienceScreenIds.length} TV</span>
            </div>
            {audienceScreenIds.length === 0 && audience.groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune TV ni groupe enregistré sur cette playlist. Cochez ci-dessous pour l’affecter.</p>
            ) : (
              <>
                {audience.groups.length > 0 && <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Groupes ({audience.groups.length})</p>
                  {audience.groups.map((g) => (
                    <div key={g.id} className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2 py-1.5 text-sm">
                      <Users className="size-4 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate">{g.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{g.screenIds.length} TV</span>
                    </div>
                  ))}
                </div>}
                {audienceScreenIds.length > 0 && <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">TV ({audienceScreenIds.length})</p>
                  <div className="max-h-52 space-y-1 overflow-y-auto">
                    {[...audience.directScreens, ...audience.inheritedScreens].map((sc) => (
                      <div key={sc.id} className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm">
                        <MonitorPlay className="size-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate">{sc.name}</span>
                        {audience.inheritedScreens.some((x) => x.id === sc.id) && <span className="shrink-0 text-xs text-muted-foreground">via son groupe</span>}
                        <span className={`shrink-0 text-xs ${sc.status === "online" ? "text-primary" : "text-muted-foreground"}`}>{sc.status === "online" ? "En ligne" : "Hors ligne"}</span>
                      </div>
                    ))}
                  </div>
                </div>}
              </>
            )}
          </CardContent></Card>
          <Card><CardContent className="space-y-3 p-4">
            <h2 className="text-sm font-semibold">Affecter</h2>
            {groups.length > 0 && <div className="space-y-2"><p className="text-xs font-medium text-muted-foreground">Groupes</p>
              {groups.map((g) => { const assigned = assignedGroupIds.includes(g.id); return <label key={g.id} className="flex items-center gap-2 text-sm"><Checkbox disabled={assigned} checked={assigned || pickedGroups.includes(g.id)} onCheckedChange={(v) => setPickedGroups((l) => toggle(l, g.id, v === true))} /><span className="truncate">{g.name}</span>{assigned && <span className="ml-auto shrink-0 text-xs text-muted-foreground">déjà affecté</span>}</label>; })}
            </div>}
            {screens.length > 0 && <div className="max-h-60 space-y-2 overflow-y-auto"><p className="text-xs font-medium text-muted-foreground">TV</p>
              {screens.map((sc) => { const covered = resolved.coveredScreenIds.includes(sc.id); const assigned = audienceScreenIds.includes(sc.id); return <label key={sc.id} className="flex items-center gap-2 text-sm"><Checkbox disabled={covered || assigned} checked={covered || assigned || pickedScreens.includes(sc.id)} onCheckedChange={(v) => setPickedScreens((l) => toggle(l, sc.id, v === true))} /><span className="truncate">{sc.name}</span>{covered && <span className="ml-auto shrink-0 text-xs text-muted-foreground">via son groupe</span>}{!covered && assigned && <span className="ml-auto shrink-0 text-xs text-muted-foreground">déjà affectée</span>}</label>; })}
            </div>}
            <Button className="w-full" disabled={!resolved.groupIds.length && !resolved.screenIds.length} onClick={() => { void assign().catch((error) => toast.error(error instanceof Error ? error.message : "L’affectation a échoué")); }}>Affecter la playlist</Button>
          </CardContent></Card>
          <Card><CardContent className="p-4 [&>section]:mt-0 [&>section]:border-t-0 [&>section]:pt-0"><PlaylistMusicPanel playlistId={playlist.id} /></CardContent></Card>
          <Card><CardContent className="p-4">
            <Label className="mb-3 block">Bibliothèque</Label>
            {media.length === 0 ? <p className="text-sm text-muted-foreground">Importez d'abord des médias dans la Médiathèque.</p> : (
              <ul className="max-h-96 space-y-1 overflow-y-auto">
                {media.map((m) => (
                  <li key={m.id}><Button variant="ghost" disabled={busy} onClick={() => add(m.id)} className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted">
                    {m.type === 'webpage' ? <Globe className="size-4 text-primary" /> : m.type === "video" ? <Film className="size-4 text-primary" /> : <Plus className="size-4 text-primary" />}<span className="truncate">{m.name}</span>
                  </Button></li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
