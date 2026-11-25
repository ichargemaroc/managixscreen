import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FolderTree, Plus, Trash2, MapPin, Pencil } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore, addGroup, deleteGroup, updateGroup, setGroupMember, type Group } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/groups")({
  validateSearch: (search: Record<string, unknown>): { g?: string } => (typeof search["g"] === "string" ? { g: search["g"] } : {}),
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { title: "Groupes — ScreenFlow" },
    { name: "description", content: "Organisez vos écrans par groupes et par lieux." },
    { property: "og:title", content: "Groupes — ScreenFlow" },
    { property: "og:description", content: "Organisez vos écrans par groupes et par lieux." },
  ] }),
  component: GroupsPage,
});

function GroupsPage() {
  const { groups, screens, refresh } = useStore();
  const { g: highlight } = Route.useSearch();
  const [editing, setEditing] = useState<Group | null>(null);
  const [open, setOpen] = useState(false); const [name, setName] = useState(""); const [loc, setLoc] = useState("");
  useEffect(() => {
    if (!highlight) return;
    document.getElementById(`group-${highlight}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight, groups.length]);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Groupes" description="Regroupez vos écrans par zone, magasin ou usage." action={<Button onClick={() => setOpen(true)}><Plus /> Nouveau groupe</Button>} />
      {groups.length === 0 ? (
        <EmptyState icon={FolderTree} title="Aucun groupe" text="Créez des groupes pour diffuser une playlist sur plusieurs écrans à la fois." action={<Button onClick={() => setOpen(true)}><Plus /> Créer un groupe</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.id} id={`group-${g.id}`} className={highlight === g.id ? "ring-2 ring-accent" : ""}><CardContent className="flex items-start justify-between p-5">
              <div>
                <p className="font-semibold">{g.name}</p>
                {g.location && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{g.location}</p>}
                <p className="mt-3 text-sm">{g.screenIds.length} écran(s)</p>
              </div>
              <div className="flex"><Button variant="ghost" size="icon" aria-label="Gérer le groupe" onClick={() => { setEditing(g); setName(g.name); setLoc(g.location); setOpen(true); }}><Pencil /></Button>
              <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={async () => { await deleteGroup(g.id); refresh(); }}><Trash2 /></Button></div>
            </CardContent></Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) { setEditing(null); setName(""); setLoc(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Gérer le groupe" : "Nouveau groupe"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Vitrines" /></div>
            <div className="space-y-2"><Label>Lieu</Label><Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Ex. Paris — Rivoli" /></div>
            {editing && <div className="space-y-2"><Label>Écrans</Label>{screens.map((screen) => <label key={screen.id} className="flex items-center gap-2 text-sm"><Checkbox checked={groups.find((g) => g.id === editing.id)?.screenIds.includes(screen.id) ?? false} onCheckedChange={async (checked) => { try { await setGroupMember(editing.id, screen.id, checked === true); refresh(); } catch { toast.error("La modification a échoué"); } }} />{screen.name}</label>)}</div>}
          </div>
          <DialogFooter><Button disabled={!name.trim()} onClick={async () => { if (editing) await updateGroup(editing.id, name.trim(), loc.trim()); else await addGroup(name.trim(), loc.trim()); refresh(); setName(""); setLoc(""); setOpen(false); setEditing(null); }}>{editing ? "Enregistrer" : "Créer"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
