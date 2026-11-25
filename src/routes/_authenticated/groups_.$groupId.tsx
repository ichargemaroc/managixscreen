import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore, updateGroup, setGroupMember } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/groups_/$groupId")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { title: "Gérer le groupe — ScreenFlow" },
    { name: "description", content: "Renommez un groupe et choisissez ses écrans." },
    { property: "og:title", content: "Gérer le groupe — ScreenFlow" },
    { property: "og:description", content: "Renommez un groupe et choisissez ses écrans." },
  ] }),
  component: GroupPage,
});

function GroupPage() {
  const { groupId } = Route.useParams();
  const { groups, screens, refresh } = useStore();
  const navigate = useNavigate();
  const group = groups.find((g) => g.id === groupId);
  const [name, setName] = useState(""); const [loc, setLoc] = useState("");
  useEffect(() => { if (group) { setName(group.name); setLoc(group.location); } }, [group?.id]);
  if (!group) return <div className="mx-auto max-w-3xl"><p className="text-muted-foreground">Groupe introuvable.</p><Button variant="outline" asChild className="mt-4"><Link to="/groups">Retour aux groupes</Link></Button></div>;
  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="ghost" asChild className="mb-2"><Link to="/groups"><ArrowLeft /> Groupes</Link></Button>
      <PageHeader title="Gérer le groupe" description={group.name} />
      <Card><CardContent className="space-y-5 p-6">
        <div className="space-y-2"><Label htmlFor="g-name">Nom</Label><Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Vitrines" /></div>
        <div className="space-y-2"><Label htmlFor="g-loc">Lieu</Label><Input id="g-loc" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Ex. Paris — Rivoli" /></div>
        <div className="space-y-2"><Label>Écrans</Label>{screens.map((screen) => <label key={screen.id} className="flex items-center gap-2 text-sm"><Checkbox checked={group.screenIds.includes(screen.id)} onCheckedChange={async (checked) => { try { await setGroupMember(group.id, screen.id, checked === true); refresh(); } catch { toast.error("La modification a échoué"); } }} />{screen.name}</label>)}</div>
        <div className="flex justify-end"><Button disabled={!name.trim()} onClick={async () => { try { await updateGroup(group.id, name.trim(), loc.trim()); refresh(); toast.success("Groupe enregistré"); navigate({ to: "/groups", search: {} }); } catch { toast.error("Enregistrement impossible"); } }}>Enregistrer</Button></div>
      </CardContent></Card>
    </div>
  );
}
