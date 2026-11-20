import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FolderTree, Plus, Trash2, MapPin } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore, uid } from "@/lib/store";

export const Route = createFileRoute("/groups")({
  head: () => ({ meta: [
    { title: "Groups — ScreenFlow" },
    { name: "description", content: "Organisez vos écrans par groupes et par lieux." },
    { property: "og:title", content: "Groups — ScreenFlow" },
    { property: "og:description", content: "Organisez vos écrans par groupes et par lieux." },
  ] }),
  component: GroupsPage,
});

function GroupsPage() {
  const { groups, screens, set } = useStore();
  const [open, setOpen] = useState(false); const [name, setName] = useState(""); const [loc, setLoc] = useState("");
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Groupes" description="Regroupez vos écrans par zone, magasin ou usage." action={<Button onClick={() => setOpen(true)}><Plus /> Nouveau groupe</Button>} />
      {groups.length === 0 ? (
        <EmptyState icon={FolderTree} title="Aucun groupe" text="Créez des groupes pour diffuser une playlist sur plusieurs écrans à la fois." action={<Button onClick={() => setOpen(true)}><Plus /> Créer un groupe</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Card key={g.id}><CardContent className="flex items-start justify-between p-5">
              <div>
                <p className="font-semibold">{g.name}</p>
                {g.location && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{g.location}</p>}
                <p className="mt-3 text-sm">{screens.filter((s) => s.groupId === g.id).length} écran(s)</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => set((s) => ({ ...s, groups: s.groups.filter((x) => x.id !== g.id), screens: s.screens.map((sc) => (sc.groupId === g.id ? { ...sc, groupId: null } : sc)), schedules: s.schedules.filter((x) => !(x.targetType === "group" && x.targetId === g.id)) }))}><Trash2 /></Button>
            </CardContent></Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau groupe</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Vitrines" /></div>
            <div className="space-y-2"><Label>Lieu</Label><Input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Ex. Paris — Rivoli" /></div>
          </div>
          <DialogFooter><Button disabled={!name.trim()} onClick={() => { set((s) => ({ ...s, groups: [...s.groups, { id: uid(), name: name.trim(), location: loc.trim() }] })); setName(""); setLoc(""); setOpen(false); }}>Créer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
