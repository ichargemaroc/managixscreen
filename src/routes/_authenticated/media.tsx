import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Image as ImageIcon, Upload, Trash2, Globe, ListPlus, ListX, X, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mediaKind } from "@/lib/signage-rules";
import { useStore, formatBytes, formatDuration, addMedia, deleteMedia, renameMedia, savePlaylistItems, type Media } from "@/lib/store";
import { WebpageEditor } from '@/components/webpage-editor';
import { WebpagePreview } from '@/components/webpage-preview';
import { MediaActionMenu } from '@/components/media-action-menu';
import { addLibraryItems, removeLibraryItems } from '@/lib/media-playlist-items';
import { VideoThumbnail } from '@/components/video-thumbnail';

export const Route = createFileRoute("/_authenticated/media")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { title: "Médiathèque — ScreenFlow" },
    { name: "description", content: "Importez et organisez vos photos et vidéos." },
    { property: "og:title", content: "Médiathèque — ScreenFlow" },
    { property: "og:description", content: "Importez et organisez vos photos et vidéos." },
  ] }),
  component: MediaPage,
});

function readDuration(url: string) {
  return new Promise<number | null>((res) => {
    const v = document.createElement("video");
    v.preload = "metadata"; v.onloadedmetadata = () => res(v.duration); v.onerror = () => res(null); v.src = url;
  });
}

function MediaPage() {
  const { media, playlists, refresh } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState("all"); const [q, setQ] = useState(""); const [preview, setPreview] = useState<Media | null>(null);
  const [renaming, setRenaming] = useState<Media | null>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [action, setAction] = useState<{ kind: 'add' | 'remove' | 'delete'; media: Media[] } | null>(null);
  const [playlistIds, setPlaylistIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const list = media.filter((m) => (tab === "all" || m.type === tab) && m.name.toLowerCase().includes(q.toLowerCase()));
  const selectedMedia = media.filter(m => selected.includes(m.id));
  const affectedPlaylists = playlists.filter(p => p.items.some(item => action?.media.some(m => m.id === item.mediaId)));

  function openAction(kind: 'add' | 'remove' | 'delete', targets: Media[]) {
    setPlaylistIds([]);
    setAction({ kind, media: targets });
  }

  async function applyAction() {
    if (!action || busy) return;
    setBusy(true);
    let completed = 0;
    try {
      if (action.kind === 'delete') {
        for (const item of action.media) { await deleteMedia(item); completed++; }
        setSelected(ids => ids.filter(id => !action.media.some(m => m.id === id)));
        toast.success(`${completed} fichier(s) supprimé(s)`);
      } else {
        const targets = action.kind === 'add' ? playlists.filter(p => playlistIds.includes(p.id)) : affectedPlaylists;
        for (const playlist of targets) {
          const next = action.kind === 'add'
            ? addLibraryItems(playlist.items, action.media)
            : removeLibraryItems(playlist.items, action.media.map(m => m.id));
          if (next.length !== playlist.items.length) await savePlaylistItems(playlist.id, next);
          completed++;
        }
        toast.success(`${completed} playlist(s) traitée(s)`);
      }
      setAction(null);
    } catch {
      toast.error(completed ? `${completed} opération(s) effectuée(s), puis un échec. Vérifiez avant de réessayer.` : "L’opération a échoué. Réessayez.");
      setAction(null);
    } finally {
      refresh();
      setBusy(false);
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    let added = 0;
    try {
      for (const f of Array.from(files)) {
        const type = mediaKind(f.type, f.name);
        if (!type) { toast.error(`Format non pris en charge : ${f.name}`); continue; }
        let duration: number | null = null;
        if (type === "video") {
          const url = URL.createObjectURL(f);
          duration = await readDuration(url);
          URL.revokeObjectURL(url);
        }
        await addMedia(f, type, duration);
        added++;
      }
      refresh();
      if (added) toast.success(`${added} média(s) ajouté(s)`);
    } catch {
      refresh();
      toast.error("L'import a échoué, réessayez.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Médiathèque" description="Photos et vidéos disponibles pour vos playlists."
        action={<div className="flex gap-2"><WebpageEditor /><Button onClick={() => input.current?.click()} disabled={uploading}><Upload /> {uploading ? "Import en cours…" : "Importer"}</Button></div>} />
      <input ref={input} type="file" accept="image/*,video/*,.mp4" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      {media.length === 0 ? (
        <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}>
          <EmptyState icon={ImageIcon} title="Bibliothèque vide" text="Glissez vos fichiers ici ou cliquez sur Importer. Formats image et vidéo acceptés."
            action={<Button onClick={() => input.current?.click()}><Upload /> Importer des médias</Button>} />
        </div>
      ) : (
        <>
          <div className="mb-6 flex min-w-0 flex-col gap-3 border-b border-border sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <Tabs className="min-w-0 overflow-x-auto" value={tab} onValueChange={setTab}><TabsList className="console-content-tabs" aria-label="Type de média">
              <TabsTrigger value="all">Tous</TabsTrigger><TabsTrigger value="image">Photos</TabsTrigger><TabsTrigger value="video">Vidéos</TabsTrigger><TabsTrigger value="webpage">Pages Web</TabsTrigger>
            </TabsList></Tabs>
            <Input className="mb-3 h-10 shrink-0 sm:w-64" aria-label="Rechercher un média" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {managing && <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-4">
            <label className="mr-2 flex items-center gap-2 text-sm"><Checkbox aria-label="Sélectionner tous les médias affichés" checked={list.length > 0 && list.every(m => selected.includes(m.id)) ? true : list.some(m => selected.includes(m.id)) ? 'indeterminate' : false} onCheckedChange={checked => setSelected(ids => checked ? [...new Set([...ids, ...list.map(m => m.id)])] : ids.filter(id => !list.some(m => m.id === id)))} />Tout sélectionner</label>
            <span className="mr-auto text-sm text-muted-foreground">{selectedMedia.length} sélectionné(s)</span>
            <Button variant="outline" size="sm" disabled={busy || !selectedMedia.length} onClick={() => openAction('add', selectedMedia)}><ListPlus />Ajouter aux playlists</Button>
            <Button variant="outline" size="sm" disabled={busy || !selectedMedia.length} onClick={() => openAction('remove', selectedMedia)}><ListX />Retirer des playlists</Button>
            <Button variant="destructive" size="sm" disabled={busy || !selectedMedia.length} onClick={() => openAction('delete', selectedMedia)}><Trash2 />Supprimer</Button>
            <Button variant="ghost" size="icon" aria-label="Terminer la sélection" title="Terminer la sélection" onClick={() => { setManaging(false); setSelected([]); }}><X /></Button>
          </div>}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}>
            {list.map((m, index) => (
              <Card key={m.id} className="group overflow-hidden p-0">
                <div className="relative">
                {managing && <div className="absolute left-2 top-2 z-10 flex rounded bg-background p-2 shadow-sm"><Checkbox aria-label={`Sélectionner ${m.name}`} checked={selected.includes(m.id)} onCheckedChange={checked => setSelected(ids => checked ? [...new Set([...ids, m.id])] : ids.filter(id => id !== m.id))} /></div>}
                <Button variant="ghost" aria-label={`Ouvrir ${m.name}`} className="relative block h-auto aspect-video w-full overflow-hidden rounded-none bg-muted p-0" onClick={() => setPreview(m)}>
                  {m.type === 'webpage' ? <div className="flex size-full flex-col items-center justify-center gap-3 text-primary"><Globe className="size-10" /><span className="max-w-full truncate px-3 text-sm">{new URL(m.url).hostname}</span></div> : m.type === "image" ? <img src={m.thumbnailUrl || m.url} alt={m.name} loading={index < 4 ? "eager" : "lazy"} decoding="async" width={480} height={270} className="size-full object-cover" onError={(event) => { const image = event.currentTarget; if (image.src !== m.url) image.src = m.url; }} /> : <VideoThumbnail media={m} />}
                </Button>
                </div>
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.type === 'webpage' ? `Page Web · ${formatDuration(m.duration)}` : `${m.type === "image" ? "Photo" : "Vidéo"} · ${formatBytes(m.size)}`}{m.type === "video" ? ` · ${formatDuration(m.duration)}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 flex-col">{m.type === 'webpage' && <WebpageEditor key={`${m.id}:${m.url}`} media={m} />}
                  <MediaActionMenu name={m.name} busy={busy} onAdd={() => openAction('add', [m])} onRemove={() => openAction('remove', [m])} onDelete={() => openAction('delete', [m])} onRename={() => { setRenaming(m); setName(m.name); }} onManage={() => { setManaging(true); setSelected([m.id]); }} /></div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      <Dialog open={!!action} onOpenChange={open => { if (!open && !busy) setAction(null); }}>
        <DialogContent className="max-h-[85svh] overflow-y-auto">
          <DialogHeader><DialogTitle>{action?.kind === 'add' ? 'Ajouter aux playlists' : action?.kind === 'remove' ? 'Retirer de toutes les playlists' : 'Supprimer les fichiers'}</DialogTitle></DialogHeader>
          <p className="break-words text-sm text-muted-foreground">{action?.media.length === 1 ? action.media[0]?.name : `${action?.media.length ?? 0} fichiers sélectionnés`}</p>
          {action?.kind === 'add' ? <div className="space-y-1">
            {playlists.length === 0 ? <p className="py-4 text-sm text-muted-foreground">Aucune playlist disponible.</p> : playlists.map(playlist => <label key={playlist.id} className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-3 hover:bg-accent">
              <Checkbox disabled={busy} checked={playlistIds.includes(playlist.id)} onCheckedChange={checked => setPlaylistIds(ids => checked ? [...ids, playlist.id] : ids.filter(id => id !== playlist.id))} />
              <span className="min-w-0 flex-1 break-words text-sm">{playlist.name}</span>
              {action.media.every(m => playlist.items.some(item => item.mediaId === m.id)) && <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Check className="size-3" />Déjà présent</span>}
            </label>)}
          </div> : action?.kind === 'remove' ? <div className="space-y-3">
            <p className="text-sm">{affectedPlaylists.length ? `Retirer ces médias de ${affectedPlaylists.length} playlist(s) ? Les fichiers restent dans la médiathèque.` : 'Ces médias ne figurent dans aucune playlist.'}</p>
            {affectedPlaylists.length > 0 && <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">{affectedPlaylists.map(p => <li className="break-words" key={p.id}>{p.name}</li>)}</ul>}
          </div> : <p className="text-sm">Supprimer définitivement {action?.media.length === 1 ? 'ce fichier' : 'ces fichiers'} ? Ils seront également retirés des playlists qui les utilisent.</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setAction(null)}>Annuler</Button>
            <Button variant={action?.kind === 'delete' ? 'destructive' : 'default'} disabled={busy || (action?.kind === 'add' && !playlistIds.length) || (action?.kind === 'remove' && !affectedPlaylists.length)} onClick={() => void applyAction()}>
              {action?.kind === 'add' ? <ListPlus /> : action?.kind === 'remove' ? <ListX /> : <Trash2 />}{busy ? 'En cours…' : action?.kind === 'add' ? 'Ajouter' : action?.kind === 'remove' ? 'Retirer' : 'Supprimer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!renaming} onOpenChange={() => setRenaming(null)}><DialogContent><DialogHeader><DialogTitle>Renommer le média</DialogTitle></DialogHeader><Input aria-label="Nom du média" value={name} onChange={(e) => setName(e.target.value)} /><Button disabled={!name.trim()} onClick={async () => { if (!renaming) return; try { await renameMedia(renaming.id, name.trim()); refresh(); setRenaming(null); } catch { toast.error("Le renommage a échoué"); } }}>Enregistrer</Button></DialogContent></Dialog>
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="truncate">{preview?.name}</DialogTitle></DialogHeader>
          {preview && (preview.type === 'webpage' ? <WebpagePreview url={preview.url} name={preview.name} /> : preview.type === "image" ? <img src={preview.url} alt={preview.name} className="w-full rounded-md" /> : <video src={preview.url} controls autoPlay className="w-full rounded-md" />)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
