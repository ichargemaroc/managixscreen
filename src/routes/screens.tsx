import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Monitor, Plus, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStore, uid, isValidPairingCode, type Screen } from "@/lib/store";

export const Route = createFileRoute("/screens")({
  head: () => ({ meta: [
    { title: "Screens — ScreenFlow" },
    { name: "description", content: "Ajoutez, organisez et gérez vos TV Android." },
    { property: "og:title", content: "Screens — ScreenFlow" },
    { property: "og:description", content: "Ajoutez, organisez et gérez vos TV Android." },
  ] }),
  component: Screens,
});

const NONE = "__none";

function Screens() {
  const { screens, groups, playlists, set } = useStore();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Screen | null>(null);
  const [filter, setFilter] = useState("all");
  const list = filter === "all" ? screens : screens.filter((s) => (s.groupId ?? NONE) === filter);
  const update = (id: string, patch: Partial<Screen>) => set((s) => ({ ...s, screens: s.screens.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Écrans" description="Vos téléviseurs Android jumelés à ScreenFlow."
        action={<Button onClick={() => setAdding(true)}><Plus /> Ajouter une TV</Button>} />
      {screens.length === 0 ? (
        <EmptyState icon={Monitor} title="Aucune TV jumelée" text="Lancez l'app ScreenFlow sur votre TV Android, puis saisissez le code à 6 chiffres affiché."
          action={<Button onClick={() => setAdding(true)}><Plus /> Ajouter une TV</Button>} />
      ) : (
        <>
          <div className="mb-4 w-56">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les groupes</SelectItem>
                <SelectItem value={NONE}>Sans groupe</SelectItem>
                {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Card className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nom</TableHead><TableHead>Statut</TableHead><TableHead>Groupe / lieu</TableHead>
                <TableHead>Dernière connexion</TableHead><TableHead>Contenu diffusé</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {list.map((s) => {
                  const g = groups.find((x) => x.id === s.groupId);
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}<div className="text-xs text-muted-foreground">Code {s.pairingCode}</div></TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell>{g ? `${g.name}${g.location ? ` · ${g.location}` : ""}` : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{s.lastSeen ? new Date(s.lastSeen).toLocaleString("fr-FR") : "Jamais"}</TableCell>
                      <TableCell>{playlists.find((p) => p.id === s.playlistId)?.name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditing(s)}>Gérer / renommer</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => { set((st) => ({ ...st, screens: st.screens.filter((x) => x.id !== s.id) })); toast.success("TV supprimée"); }}>Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
      <AddDialog open={adding} onOpenChange={setAdding} onAdd={(name, code, groupId) => {
        set((s) => ({ ...s, screens: [...s.screens, { id: uid(), name, pairingCode: code, groupId, status: "pending", lastSeen: null, playlistId: null }] }));
        toast.success("TV ajoutée — en attente de connexion de l'appareil");
      }} />
      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Gérer la TV</DialogTitle></DialogHeader>
            <EditForm screen={editing} onSave={(p) => { update(editing.id, p); setEditing(null); toast.success("TV mise à jour"); }} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function GroupSelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { groups } = useStore();
  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Aucun groupe</SelectItem>
        {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function AddDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (n: string, c: string, g: string | null) => void }) {
  const [code, setCode] = useState(""); const [name, setName] = useState(""); const [group, setGroup] = useState<string | null>(null);
  const ok = isValidPairingCode(code) && name.trim().length > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une TV</DialogTitle>
          <DialogDescription>Saisissez le code à 6 chiffres affiché sur l'écran de la TV.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={(v) => setCode(v.replace(/\D/g, ""))}>
              <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
            </InputOTP>
          </div>
          <div className="space-y-2"><Label>Nom de la TV</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Accueil — Hall principal" /></div>
          <div className="space-y-2"><Label>Groupe</Label><GroupSelect value={group} onChange={setGroup} /></div>
        </div>
        <DialogFooter>
          <Button disabled={!ok} onClick={() => { onAdd(name.trim(), code, group); setCode(""); setName(""); setGroup(null); onOpenChange(false); }}>Jumeler</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditForm({ screen, onSave }: { screen: Screen; onSave: (p: Partial<Screen>) => void }) {
  const { playlists } = useStore();
  const [name, setName] = useState(screen.name); const [group, setGroup] = useState(screen.groupId); const [pl, setPl] = useState(screen.playlistId);
  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="space-y-2"><Label>Groupe</Label><GroupSelect value={group} onChange={setGroup} /></div>
      <div className="space-y-2"><Label>Playlist affectée</Label>
        <Select value={pl ?? NONE} onValueChange={(v) => setPl(v === NONE ? null : v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={NONE}>Aucune</SelectItem>{playlists.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <DialogFooter><Button disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), groupId: group, playlistId: pl })}>Enregistrer</Button></DialogFooter>
    </div>
  );
}
