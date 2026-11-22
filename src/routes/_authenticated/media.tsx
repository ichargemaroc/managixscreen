import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Image as ImageIcon, Upload, Trash2, Film, Pencil, Globe } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mediaKind } from "@/lib/signage-rules";
import { useStore, formatBytes, formatDuration, addMedia, deleteMedia, renameMedia, type Media } from "@/lib/store";
import { WebpageEditor } from '@/components/webpage-editor';
import { WebpagePreview } from '@/components/webpage-preview';

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
  const { media, refresh } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState("all"); const [q, setQ] = useState(""); const [preview, setPreview] = useState<Media | null>(null);
  const [renaming, setRenaming] = useState<Media | null>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const list = media.filter((m) => (tab === "all" || m.type === tab) && m.name.toLowerCase().includes(q.toLowerCase()));

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
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={tab} onValueChange={setTab}><TabsList>
              <TabsTrigger value="all">Tous</TabsTrigger><TabsTrigger value="image">Photos</TabsTrigger><TabsTrigger value="video">Vidéos</TabsTrigger><TabsTrigger value="webpage">Pages Web</TabsTrigger>
            </TabsList></Tabs>
            <Input className="sm:w-64" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}>
            {list.map((m, index) => (
              <Card key={m.id} className="group overflow-hidden p-0">
                <Button variant="ghost" aria-label={`Ouvrir ${m.name}`} className="relative block h-auto aspect-video w-full overflow-hidden rounded-none bg-muted p-0" onClick={() => setPreview(m)}>
                  {m.type === 'webpage' ? <div className="flex size-full flex-col items-center justify-center gap-3 text-primary"><Globe className="size-10" /><span className="max-w-full truncate px-3 text-sm">{new URL(m.url).hostname}</span></div> : m.type === "image" ? <img src={m.thumbnailUrl || m.url} alt={m.name} loading={index < 4 ? "eager" : "lazy"} decoding="async" width={480} height={270} className="size-full object-cover" onError={(event) => { const image = event.currentTarget; if (image.src !== m.url) image.src = m.url; }} /> : <div className="flex size-full items-center justify-center text-muted-foreground"><Film className="size-10" /></div>}
                </Button>
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.type === 'webpage' ? `Page Web · ${formatDuration(m.duration)}` : `${m.type === "image" ? "Photo" : "Vidéo"} · ${formatBytes(m.size)}`}{m.type === "video" ? ` · ${formatDuration(m.duration)}` : ""}</p>
                  </div>
                  <div className="flex flex-col">{m.type === 'webpage' ? <WebpageEditor key={`${m.id}:${m.url}`} media={m} /> : <Button variant="ghost" size="icon" aria-label="Renommer" onClick={() => { setRenaming(m); setName(m.name); }}><Pencil /></Button>}
                  <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={async () => { await deleteMedia(m); refresh(); toast.success("Média supprimé"); }}><Trash2 /></Button></div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
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
