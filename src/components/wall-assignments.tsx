import { useState } from 'react';
import { Monitor, Pencil, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/app-shell';
import type { Screen } from '@/lib/store';
import { assignWallScreen, type WallConfig, type WallMember, type VideoWall } from '@/lib/video-wall';

type Props = { config: WallConfig; members: WallMember[]; screens: Screen[]; walls: VideoWall[]; wallId: string | null; busy: boolean; onChange: (members: WallMember[]) => void };

export function WallAssignments({ config, members, screens, walls, wallId, busy, onChange }: Props) {
  const [cell, setCell] = useState<{ row: number; column: number } | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const openCell = (row: number, column: number) => { setSearch(''); setError(''); setCell({ row, column }); };
  const assign = (row: number, column: number, id: string | null) => {
    try { onChange(assignWallScreen(config, members, row, column, id, wallId, walls, screens.map(s => s.id))); setCell(null); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Affectation impossible.'); }
  };
  return <>
    <div className="wall-assignment-grid" style={{ gridTemplateColumns: `repeat(${config.columns},minmax(160px,1fr))` }}>
      {Array.from({ length: config.rows * config.columns }, (_, i) => {
        const row = Math.floor(i / config.columns), column = i % config.columns;
        const member = members.find(m => m.row_index === row && m.column_index === column);
        const screen = screens.find(s => s.id === member?.screen_id);
        const conflict = member && walls.find(w => w.id !== wallId && w.members.some(m => m.screen_id === member.screen_id));
        const issue = member && !screen ? 'Écran introuvable' : conflict ? `Déjà affecté : ${conflict.name}` : screen?.revoked ? 'Accès de cet écran révoqué' : '';
        return <div key={i} className={`min-w-0 rounded-md border p-3 ${issue ? 'border-destructive' : 'border-border'}`}>
          <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>Ligne {row + 1} · Colonne {column + 1}</span>{member && <Button disabled={busy} variant="ghost" size="icon" className="size-6" title="Retirer l’écran" aria-label={`Retirer l’écran ${row + 1}:${column + 1}`} onClick={() => assign(row, column, null)}><X /></Button>}</div>
          <Button disabled={busy} variant="ghost" className="h-auto min-h-24 w-full min-w-0 flex-col gap-2 whitespace-normal px-1" aria-label={`Affecter une TV ligne ${row + 1} colonne ${column + 1}`} onClick={() => openCell(row, column)}>
            {screen ? <><Monitor /><span className="w-full break-words text-sm font-medium">{screen.name}</span><StatusBadge status={screen.status} /><span className="flex items-center gap-1 text-xs text-muted-foreground"><Pencil className="size-3" />Modifier</span></> : <><Monitor /><span>Affecter une TV</span></>}
          </Button>
          {member?.assigned_at && <p className="mt-2 text-xs text-muted-foreground">Affectée le {new Date(member.assigned_at).toLocaleString('fr-FR')}</p>}
          {issue && <p role="alert" className="mt-2 text-xs text-destructive">{issue}</p>}
        </div>;
      })}
    </div>
    {!cell && error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Dialog open={Boolean(cell)} onOpenChange={v => { if (!v) setCell(null); }}><DialogContent className="z-[60] max-w-[calc(100%-2rem)] sm:max-w-xl"><DialogHeader><DialogTitle>Affecter une TV · {cell ? `${cell.row + 1}:${cell.column + 1}` : ''}</DialogTitle><DialogDescription>Télévisions enregistrées</DialogDescription></DialogHeader>
      <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Rechercher une télévision" placeholder="Nom ou identifiant" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <div className="max-h-[50svh] overflow-y-auto divide-y">
        {screens.filter(s => `${s.name} ${s.id}`.toLowerCase().includes(search.toLowerCase())).map(s => {
          const elsewhere = walls.find(w => w.id !== wallId && w.members.some(m => m.screen_id === s.id));
          const current = members.find(m => m.screen_id === s.id);
          const moving = current && cell && (current.row_index !== cell.row || current.column_index !== cell.column);
          return <Button key={s.id} variant="ghost" disabled={busy || Boolean(elsewhere) || s.revoked} className="h-auto w-full min-w-0 justify-start whitespace-normal rounded-none px-2 py-4 text-left" onClick={() => { if (cell) assign(cell.row, cell.column, s.id); }}>
            <Monitor className="shrink-0" /><span className="min-w-0 flex-1"><span className="block break-words font-medium">{s.name}</span><span className="block break-all text-xs text-muted-foreground">{s.id}</span><span className="mt-1 block text-xs text-muted-foreground">{elsewhere ? `Déjà affecté à « ${elsewhere.name} »` : s.revoked ? 'Accès révoqué' : moving ? `Déplacer depuis ${current.row_index + 1}:${current.column_index + 1}` : current ? 'Affectation actuelle' : 'Disponible'}</span></span><StatusBadge status={s.status} />
          </Button>;
        })}
        {!screens.length && <p className="py-6 text-center text-sm text-muted-foreground">Aucune télévision enregistrée.</p>}
        {screens.length > 0 && !screens.some(s => `${s.name} ${s.id}`.toLowerCase().includes(search.toLowerCase())) && <p className="py-6 text-center text-sm text-muted-foreground">Aucune télévision trouvée.</p>}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end"><Button variant="ghost" onClick={() => setCell(null)}>Annuler</Button></div>
    </DialogContent></Dialog>
  </>;
}