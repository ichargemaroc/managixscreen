import { useEffect, useState } from 'react';
import { Crosshair, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStore, testVideoWall } from '@/lib/store';
import type { VideoWall } from '@/lib/video-wall';
import { DEFAULT_POSITION_TEST_SECONDS, positionColor, positionNumber } from '@/lib/position-test';
import { toast } from 'sonner';

export function WallPositionTest({ wall }: { wall: VideoWall }) {
  const { screens, commands, refresh } = useStore();
  const [duration, setDuration] = useState(DEFAULT_POSITION_TEST_SECONDS);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const latest = commands.find(c => c.wallId === wall.id && c.testId);
  const rows = latest ? commands.filter(c => c.testId === latest.testId) : [];
  useEffect(() => {
    setNow(Date.now());
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const updates = setInterval(refresh, 5000);
    return () => { clearInterval(clock); clearInterval(updates); };
  }, [refresh]);
  const send = async (action: 'start' | 'stop') => {
    setBusy(true);
    try { await testVideoWall(wall.id, action, duration); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Test indisponible.'); }
    finally { setBusy(false); }
  };
  const status = (screenId: string) => {
    const command = rows.find(c => c.screenId === screenId);
    const screen = screens.find(s => s.id === screenId);
    if (!screen?.deviceId || screen.revoked) return 'Appareil non associé';
    if (command?.error === 'offline') return 'Hors ligne · test non envoyé';
    if (command?.error === 'queue_full') return 'Non envoyé · file pleine';
    if (!command) return screen.status === 'online' ? 'Prêt' : 'Hors ligne';
    if (command.status === 'failed') return 'Échec du lecteur';
    if (Date.parse(command.expiresAt) <= now || command.status === 'expired') return command.acknowledgedAt ? 'Test terminé' : 'Expiré · non confirmé';
    if (command.status === 'completed') return command.command === 'stop_position_test' ? 'Arrêt confirmé' : 'Test affiché · confirmé';
    if (screen.status !== 'online') return 'Hors ligne · non confirmé';
    return command.status === 'delivered' ? 'Transmis · affichage non confirmé' : 'En attente du lecteur';
  };
  return <section className="mt-7 border-t pt-5">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <h3 className="text-sm font-medium">Test de position</h3>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1"><Label htmlFor={`test-duration-${wall.id}`}>Durée (secondes)</Label><Input className="w-28" id={`test-duration-${wall.id}`} type="number" min={10} max={300} value={duration} onChange={e => setDuration(Number(e.target.value))}/></div>
        <Button variant="secondary" disabled={busy || !wall.members.length || !Number.isInteger(duration) || duration < 10 || duration > 300} onClick={() => void send('start')}><Crosshair/>Test de position</Button>
        <Button variant="outline" disabled={busy || !latest} onClick={() => void send('stop')}><Square/>Arrêter le test</Button>
      </div>
    </div>
    <div className="grid gap-2 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${wall.columns}, minmax(100px, 1fr))` }}>
      {Array.from({ length: wall.rows * wall.columns }, (_, i) => {
        const row = Math.floor(i / wall.columns), column = i % wall.columns;
        const number = positionNumber(row, column, wall.columns);
        const member = wall.members.find(m => m.row_index === row && m.column_index === column);
        const screen = screens.find(s => s.id === member?.screen_id);
        return <div key={i} className={`position-cell ${positionColor(number)}`}>
          <strong className="block text-3xl">{number}</strong>
          <p className="mt-1 break-words text-sm font-medium">{screen?.name ?? 'Position libre'}</p>
          <p className="mt-1 text-xs">Ligne {row + 1} · Colonne {column + 1}</p>
          {member && <p className="mt-3 break-words text-xs" role="status">{status(member.screen_id)}</p>}
        </div>;
      })}
    </div>
    {latest?.command === 'stop_position_test' && rows.filter(c => !wall.members.some(m => m.screen_id === c.screenId)).map(c => <p key={c.id} className="mt-2 text-sm">{screens.find(s => s.id === c.screenId)?.name ?? 'Écran retiré'} · {status(c.screenId)}</p>)}
  </section>;
}