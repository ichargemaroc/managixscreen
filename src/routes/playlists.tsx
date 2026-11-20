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
import { useStore, uid, formatDuration, type Playlist } from "@/lib/store";

export const Route = createFileRoute("/playlists")({
  head: () => ({ meta: [
    { title: "Playlists — ScreenFlow" },
    { name: "description", content: "Composez vos playlists et affectez-les à vos écrans." },
    { property: "og:title", content: "Playlists — ScreenFlow" },
    { property: "og:description", content: "Composez vos playlists et affectez-les à vos écrans." },
  ] }),
  component: Playlists,
});

function Playlists() {
  const { playlists, media, set } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = playlists.find((p) => p.id === openId);
  const create = () => {
    const p: Playlist = { id: uid(), name: `Nouvelle playlist ${playlists.length + 1}`, items: [], createdAt: new Date().toISOString() };
    set((s) => ({ ...s, playlists: [...s.playlists, p] })); setOpenId(p.id);
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
  const { media, screens, groups, set } = useStore();
  const [drag, setDrag] = useState<number | null>(null);
  const [target, setTarget] = useState("");
  const save = (patch: Partial<Playlist>) => set((s) => ({ ...s, playlists: s.playlists.map((p) => (p.id === playlist.id ? { ...p, ...patch } : p)) }));
  const add = (mediaId: string) => { const m = media.find((x) => x.id === mediaId)!; save({ items: [...playlist.items, { id: uid(), mediaId, duration: m.type === "video" ? Math.round(m.duration ?? 10) : 10 }] }); };
  const move = (from: number, to: number) => { const items = [...playlist.items]; const [x] = items.splice(from, 1); if (x) items.splice(to, 0, x); save({ items }); };
  const assign = () => {
    const [type, id] = target.split(":");
    set((s) => ({ ...s, screens: s.screens.map((sc) => ((type === "screen" ? sc.id === id : sc.groupId === id) ? { ...sc, playlistId: playlist.id } : sc)) }));
    toast.success("Playlist affectée");
  };
  return (
    <div className="mx-auto max-w-7xl">
      <Button variant="ghost" size="sm" className="mb-4" onClick={onBack}><ArrowLeft /> Playlists</Button>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input className="max-w-md font-display text-xl font-semibold" value={playlist.name} onChange={(e) => save({ name: e.target.value })} />
        <Button variant="outline" className="text-destructive" onClick={() => { set((s) => ({ ...s, playlists: s.playlists.filter((p) => p.id !== playlist.id), schedules: s.schedules.filter((x) => x.playlistId !== playlist.id), screens: s.screens.map((sc) => (sc.playlistId === playlist.id ? { ...sc, playlistId: null } : sc)) })); onBack(); }}><Trash2 /> Supprimer</Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card><CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Ordre de diffusion</h2>
          {playlist.items.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Ajoutez des médias depuis la colonne de droite.</p> : (
            <ul className="space-y-2">
              {playlist.items.map((it, i) => {
                const m = media.find((x) => x.id === it.mediaId); if (!m) return null;
                return (
                  <li key={it.id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null && drag !== i) move(drag, i); setDrag(null); }}
                    className={`flex items-center gap-3 rounded-lg border bg-card p-2 ${drag === i ? "opacity-50" : ""}`}>
                    <GripVertical className="size-4 cursor-grab text-muted-foreground" />
                    <div className="h-10 w-16 overflow-hidden rounded bg-muted">{m.type === "image" ? <img src={m.url} alt="" className="size-full object-cover" /> : <video src={m.url} muted className="size-full object-cover" />}</div>
                    <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                    {m.type === "image" ? (
                      <div className="flex items-center gap-1"><Input type="number" min={1} className="h-8 w-16" value={it.duration} onChange={(e) => save({ items: playlist.items.map((x) => (x.id === it.id ? { ...x, duration: Math.max(1, Number(e.target.value) || 1) } : x)) })} /><span className="text-xs text-muted-foreground">s</span></div>
                    ) : <span className="text-xs text-muted-foreground">{formatDuration(m.duration)}</span>}
                    <Button variant="ghost" size="icon" aria-label="Retirer" onClick={() => save({ items: playlist.items.filter((x) => x.id !== it.id) })}><Trash2 /></Button>
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
            <Button className="w-full" disabled={!target} onClick={assign}>Affecter la playlist</Button>
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
