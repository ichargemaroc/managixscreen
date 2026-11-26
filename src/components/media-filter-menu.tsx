import { useState } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { emptyMediaFilters, type MediaFilters } from '@/lib/media-filters';

export function MediaFilterMenu({ value, onApply }: { value: MediaFilters; onApply: (filters: MediaFilters) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const count = Number(value.imported !== 'all') + Number(value.types.length > 0);
  const segment = 'rounded-none border-r border-border last:border-r-0 px-4 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground';
  return <Popover open={open} onOpenChange={next => { if (next) setDraft(value); setOpen(next); }}>
    <PopoverTrigger asChild><Button variant={count ? 'secondary' : 'outline'} className="h-10 shrink-0"><SlidersHorizontal />Filtrer par{count > 0 && <span className="text-xs">({count})</span>}<ChevronDown /></Button></PopoverTrigger>
    <PopoverContent align="end" className="w-[360px] max-w-[calc(100vw-2rem)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-5" aria-label="Filtres de la médiathèque">
      <div className="space-y-5">
        <div className="space-y-2"><label htmlFor="media-imported" className="text-sm font-medium">Importé</label>
          <Select value={draft.imported} onValueChange={imported => setDraft(prev => ({ ...prev, imported }))}><SelectTrigger id="media-imported"><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="all">À tout moment</SelectItem><SelectItem value="today">Aujourd’hui</SelectItem><SelectItem value="week">Les 7 derniers jours</SelectItem><SelectItem value="month">Les 30 derniers jours</SelectItem>
          </SelectContent></Select>
        </div>
        <div className="space-y-2"><p className="text-sm font-medium">Type de média</p>
          <ToggleGroup type="multiple" aria-label="Types de médias à filtrer" value={draft.types} onValueChange={types => setDraft(prev => ({ ...prev, types }))} className="justify-start gap-0 overflow-hidden rounded-md border border-border">
            <ToggleGroupItem value="video" className={segment}>Vidéos</ToggleGroupItem><ToggleGroupItem value="image" className={segment}>Images</ToggleGroupItem><ToggleGroupItem value="webpage" className={segment}>Web</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="space-y-2"><p className="text-sm font-medium text-muted-foreground">Orientation · indisponible</p>
          <ToggleGroup type="multiple" disabled aria-label="Orientation indisponible" className="justify-start gap-0 overflow-hidden rounded-md border border-border"><ToggleGroupItem value="landscape" className={segment}>Paysage</ToggleGroupItem><ToggleGroupItem value="portrait" className={segment}>Portrait</ToggleGroupItem></ToggleGroup>
        </div>
        <div className="space-y-2"><label htmlFor="media-tags" className="text-sm font-medium text-muted-foreground">Étiquettes · indisponibles</label><Input id="media-tags" disabled placeholder="Aucune étiquette disponible" /></div>
        <div className="flex justify-between gap-3 pt-1"><Button variant="outline" onClick={() => { setDraft(emptyMediaFilters); onApply(emptyMediaFilters); setOpen(false); }}>Réinitialiser</Button><Button onClick={() => { onApply(draft); setOpen(false); }}>Appliquer</Button></div>
      </div>
    </PopoverContent>
  </Popover>;
}