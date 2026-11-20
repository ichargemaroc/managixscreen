import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Image as ImageIcon, Upload, Trash2, Film } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore, formatBytes, formatDuration, addMedia, deleteMedia, type Media } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/media")({
  head: () => ({ meta: [
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
  const [uploading, setUploading] = useState(false);
  const list = media.filter((m) => (tab === "all" || m.type === tab) && m.name.toLowerCase().includes(q.toLowerCase()));

  async function onFiles(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    let added = 0;
    try {
      for (const f of Array.from(files)) {
        const type = f.type.startsWith("video/") ? "video" : f.type.startsWith("image/") ? "image" : null;
        if (!type) continue;
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
      toast.error("L'import a échoué, réessayez.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Médiathèque" description="Photos et vidéos disponibles pour vos playlists."
        action={<Button onClick={() => input.current?.click()} disabled={uploading}><Upload /> {uploading ? "Import en cours…" : "Importer"}</Button>} />
      <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      {media.length === 0 ? (
        <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}>
          <EmptyState icon={ImageIcon} title="Bibliothèque vide" text="Glissez vos fichiers ici ou cliquez sur Importer. Formats image et vidéo acceptés."
            action={<Button onClick={() => input.current?.click()}><Upload /> Importer des médias</Button>} />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={tab} onValueChange={setTab}><TabsList>
              <TabsTrigger value="all">Tous</TabsTrigger><TabsTrigger value="image">Photos</TabsTrigger><TabsTrigger value="video">Vidéos</TabsTrigger>
            </TabsList></Tabs>
            <Input className="sm:w-64" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}>
            {list.map((m) => (
              <Card key={m.id} className="group overflow-hidden p-0">
                <button className="relative block aspect-video w-full bg-muted" onClick={() => setPreview(m)}>
                  {m.type === "image" ? <img src={m.url} alt={m.name} className="size-full object-cover" /> : <video src={m.url} className="size-full object-cover" muted />}
                  {m.type === "video" && <Film className="absolute left-2 top-2 size-4 text-primary-foreground drop-shadow" />}
                </button>
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.type === "image" ? "Photo" : "Vidéo"} · {formatBytes(m.size)}{m.type === "video" ? ` · ${formatDuration(m.duration)}` : ""}</p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={async () => { await deleteMedia(m); refresh(); toast.success("Média supprimé"); }}><Trash2 /></Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle className="truncate">{preview?.name}</DialogTitle></DialogHeader>
          {preview && (preview.type === "image" ? <img src={preview.url} alt={preview.name} className="w-full rounded-md" /> : <video src={preview.url} controls autoPlay className="w-full rounded-md" />)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
