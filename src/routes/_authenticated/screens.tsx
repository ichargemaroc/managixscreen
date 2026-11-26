import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type MouseEvent } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { Monitor, Plus, ScanLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, EmptyState, StatusBadge } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStore, useBillingStore, isValidPairingCode, addScreen, deleteScreen, type Screen } from "@/lib/store";
import { availablePlaces } from '@/lib/billing';
import { PairingScanner } from "@/components/pairing-scanner";
import { ScreenHealthChart } from '@/components/screen-health-chart';
import { TvGroupSelect } from '@/components/tv-group-select';

export const Route = createFileRoute("/_authenticated/screens")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { title: "Écrans — ScreenFlow" },
    { name: "description", content: "Ajoutez, organisez et gérez vos TV Android." },
    { property: "og:title", content: "Écrans — ScreenFlow" },
    { property: "og:description", content: "Ajoutez, organisez et gérez vos TV Android." },
  ] }),
  component: Screens,
  validateSearch: (search: Record<string, unknown>): { new?: "1" } =>
    search["new"] === "1" ? { new: "1" } : {},
});

const NONE = "__none";

export function Screens() {
  const { screens, groups, playlists, refresh } = useStore();
  const queryClient = useQueryClient();
  const { data: billing } = useBillingStore();
  const navigate = useNavigate();
  const addParam = Route.useSearch()["new"];
  const [adding, setAdding] = useState(addParam === "1");
  const [confirmDelete, setConfirmDelete] = useState<Screen | null>(null);
  const [deleting, setDeleting] = useState(false);
  const closeAdd = (open: boolean) => {
    setAdding(open);
    if (!open && addParam === "1") navigate({ to: "/screens", search: {}, replace: true });
  };
  useEffect(() => {
    if (addParam === "1") setAdding(true);
  }, [addParam]);
  const [filter, setFilter] = useState("all");
  const list = filter === "all" ? screens : screens.filter((s) => (s.groupId ?? NONE) === filter);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Écrans" description="Vos téléviseurs Android et leur connexion à ScreenFlow."
        action={<Button onClick={() => setAdding(true)}><Plus /> Ajouter une TV</Button>} />
      {billing?.subscription.enforce_capacity && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4 text-sm"><p>{billing.used} / {billing.subscription.capacity} écrans utilisés · {availablePlaces(billing.subscription.capacity, billing.used)} places disponibles</p><Button variant="outline" asChild><Link to="/subscription">Gérer l’abonnement</Link></Button></div>}
      {screens.length === 0 ? (
        <EmptyState icon={Monitor} title="Aucune TV jumelée" text="Le lecteur Android TV n’est pas encore disponible. Aucun appareil n’est connecté."
          action={<Button onClick={() => setAdding(true)}><Plus /> Ajouter une TV</Button>} />
      ) : (
        <>
          <ScreenHealthChart screens={screens} groups={groups} filter={filter} onFilter={setFilter} />
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
                  const openDetail = (event: MouseEvent<HTMLElement>) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("a, button, input, select, [role='menuitem']")) return;
                    navigate({ to: "/screens/$screenId", params: { screenId: s.id } });
                  };
                  return (
                    <TableRow key={s.id} className="cursor-pointer" onClick={openDetail}>
                      <TableCell className="font-medium"><Link to="/screens/$screenId" params={{ screenId: s.id }} className="hover:underline">{s.name}</Link><div className="text-xs text-muted-foreground">{s.revoked ? "Accès révoqué" : s.enabled === false ? 'Désactivé' : s.deviceId ? "Jumelé" : "Non jumelé"}</div></TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell>{[g?.name, s.location || g?.location].filter(Boolean).join(" · ") || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{s.lastSeen ? new Date(s.lastSeen).toLocaleString("fr-FR") : "Jamais"}</TableCell>
                      <TableCell>{playlists.find((p) => p.id === s.playlistId)?.name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmDelete(s)}>
                          <Trash2 /> Supprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
      <AddDialog open={adding} onOpenChange={closeAdd} onAdd={async (name, code, groupId, location) => {
        await addScreen(name, code, groupId, location);
        refresh();
        void queryClient.invalidateQueries({ queryKey: ['billing-account'] });
        toast.success("TV jumelée — en attente de sa première connexion");
      }} />
      <Dialog open={confirmDelete !== null} onOpenChange={(open) => { if (!open && !deleting) setConfirmDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette TV ?</DialogTitle>
            <DialogDescription>{confirmDelete?.name} perdra immédiatement son accès et une place sera libérée dans le forfait.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button variant="destructive" disabled={deleting} onClick={async () => {
              if (!confirmDelete) return;
              setDeleting(true);
              try {
                await deleteScreen(confirmDelete.id);
                refresh();
                void queryClient.invalidateQueries({ queryKey: ['billing-account'] });
                toast.success("TV supprimée");
                setConfirmDelete(null);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "La suppression a échoué");
              } finally {
                setDeleting(false);
              }
            }}>{deleting ? "Suppression…" : "Supprimer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (n: string, c: string, g: string | null, location: string) => Promise<void> }) {
  const [code, setCode] = useState(""); const [name, setName] = useState(""); const [group, setGroup] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const ok = isValidPairingCode(code) && name.trim().length > 0 && !creatingGroup;
  return (
    <Dialog open={open} onOpenChange={(value) => { setScanning(false); if (!value) setCreatingGroup(false); onOpenChange(value); }}>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une TV</DialogTitle>
          <DialogDescription>Saisissez le code du lecteur TV. Il est valable 10 minutes et utilisable une seule fois.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {scanning ? <PairingScanner onCode={(value) => { setCode(value); setScanning(false); setError(""); toast.success("QR code reconnu"); }} onClose={() => setScanning(false)} /> : <Button type="button" variant="secondary" className="w-full" onClick={() => setScanning(true)}><ScanLine /> Scanner le QR code de la TV</Button>}
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={(v) => setCode(v.replace(/\D/g, ""))}>
              <InputOTPGroup>{[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}</InputOTPGroup>
            </InputOTP>
          </div>
          <div className="space-y-2"><Label>Nom de la TV</Label><Input maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Accueil — Hall principal" /></div>
          <div className="space-y-2"><Label>Lieu (facultatif)</Label><Input maxLength={240} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex. Casablanca — Accueil" /></div>
          <div className="space-y-2"><Label>Groupe</Label><TvGroupSelect value={group} onChange={setGroup} onCreatingChange={setCreatingGroup} /></div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button disabled={!ok || busy} onClick={async () => { setBusy(true); setError(""); try { await onAdd(name.trim(), code, group, location.trim()); setCode(""); setName(""); setLocation(""); setGroup(null); onOpenChange(false); } catch (err) { const message = err instanceof Error ? err.message : "La TV n’a pas pu être jumelée"; setError(message); toast.error(message); } finally { setBusy(false); } }}>{busy ? "Vérification…" : "Jumeler"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
