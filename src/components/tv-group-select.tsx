import { useState } from "react";
import { Plus } from "lucide-react";
import { addGroup, useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE = "__none";
const CREATE = "__create_group";

export function TvGroupSelect({ value, onChange, onCreatingChange }: {
  value: string | null;
  onChange: (id: string | null) => void;
  onCreatingChange: (creating: boolean) => void;
}) {
  const { groups, refresh } = useStore();
  const [created, setCreated] = useState<{ id: string; name: string }[]>([]);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const options = [...groups, ...created.filter((group) => !groups.some((item) => item.id === group.id))];
  const close = () => {
    setCreating(false);
    onCreatingChange(false);
    setName("");
    setLocation("");
    setError("");
  };
  const create = async () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const group = await addGroup(name.trim(), location.trim());
      setCreated((previous) => [...previous, group]);
      onChange(group.id);
      refresh();
      close();
    } catch {
      setError("Le groupe n’a pas pu être créé. Réessayez.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <Select value={value ?? NONE} onValueChange={(id) => {
        if (id === CREATE) {
          setCreating(true);
          onCreatingChange(true);
          return;
        }
        onChange(id === NONE ? null : id);
      }} disabled={busy}>
        <SelectTrigger aria-label="Groupe de la TV" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Aucun groupe</SelectItem>
          {options.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
          <SelectItem value={CREATE} className="mt-1 bg-accent text-accent-foreground font-medium focus:bg-accent/80"><span className="flex items-center gap-2"><Plus className="size-4" />Créer un groupe</span></SelectItem>
        </SelectContent>
      </Select>
      {creating ? (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="space-y-2"><Label htmlFor="new-tv-group-name">Nom du nouveau groupe</Label><Input id="new-tv-group-name" autoFocus maxLength={120} value={name} disabled={busy} onChange={(event) => setName(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="new-tv-group-location">Lieu du groupe (facultatif)</Label><Input id="new-tv-group-location" maxLength={240} value={location} disabled={busy} onChange={(event) => setLocation(event.target.value)} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy || !name.trim()} onClick={() => void create()}><Plus />{busy ? "Création…" : "Créer et sélectionner"}</Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={close}>Annuler</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}