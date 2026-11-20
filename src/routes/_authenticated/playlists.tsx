import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ListVideo, Plus, GripVertical, Trash2, Film, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore, formatDuration, createPlaylist, renamePlaylist, deletePlaylist, savePlaylistItems, assignPlaylist, type Playlist, type PlaylistItem } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/playlists")({
  head: () => ({ meta: [
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
                <div className="aspect-video bg-muted">{first && (first.type === "image" ? <img src={first.url} alt="" className="size-full object-cover" /> : <video src={first.url} muted className="size-full object-cover" />)}</div>
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
  const [target, setTarget] = useState("");
  const [items, setItems] = useState<PlaylistItem[]>(playlist.items);
  const persist = async (next: PlaylistItem[]) => {
    setItems(next);
    await savePlaylistItems(playlist.id, next.map((it) => ({ mediaId: it.mediaId, duration: it.duration })));
    refresh();
  };
  const add = (mediaId: string) => {
    const m = media.find((x) => x.id === mediaId)!;
    void persist([...items, { id: crypto.randomUUID(), mediaId, duration: m.type === "video" ? Math.round(m.duration ?? 10) : 10 }]);
  };
  const move = (from: number, to: number) => {
    const next = [...items]; const [x] = next.splice(from, 1); if (x) next.splice(to, 0, x);
    void persist(next);
  };
  const assign = async () => {
    const [type, id] = target.split(":") as ["screen" | "group", string];
    await assignPlaylist(playlist.id, type, id);
    refresh();
    toast.success("Playlist affectée");
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
        <Input className="max-w-md font-display text-xl font-semibold" value={playlist.name} onChange={(e) => { void renamePlaylist(playlist.id, e.target.value); refresh(); }} />
        <Button variant="outline" className="text-destructive" onClick={() => void remove()}><Trash2 /> Supprimer</Button>
      </div>
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
                    <div className="h-10 w-16 overflow-hidden rounded bg-muted">{m.type === "image" ? <img src={m.url} alt="" className="size-full object-cover" /> : <video src={m.url} muted className="size-full object-cover" />}</div>
                    <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                    {m.type === "image" ? (
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
            <h2 className="text-sm font-semibold">Affecter</h2>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue placeholder="TV ou groupe…" /></SelectTrigger>
              <SelectContent>
                {screens.map((s) => <SelectItem key={s.id} value={`screen:${s.id}`}>TV · {s.name}</SelectItem>)}
                {groups.map((g) => <SelectItem key={g.id} value={`group:${g.id}`}>Groupe · {g.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="w-full" disabled={!target} onClick={() => void assign()}>Affecter la playlist</Button>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <Label className="mb-3 block">Bibliothèque</Label>
            {media.length === 0 ? <p className="text-sm text-muted-foreground">Importez d'abord des médias dans la Médiathèque.</p> : (
              <ul className="max-h-96 space-y-1 overflow-y-auto">
                {media.map((m) => (
                  <li key={m.id}><button onClick={() => add(m.id)} className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted">
                    {m.type === "video" ? <Film className="size-4 text-primary" /> : <Plus className="size-4 text-primary" />}<span className="truncate">{m.name}</span>
                  </button></li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
