import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { savePlaylistTicker } from '@/lib/store';
import { TICKER_SPEEDS, tickerVisible, type Ticker } from '@/lib/ticker';

const SPEED_LABELS: Record<number, string> = { 15: '15 s — rapide', 30: '30 s — standard', 45: '45 s — calme', 60: '60 s — très lisible' };

export function PlaylistTickerPanel({ playlistId, initial, onSaved }: { playlistId: string; initial: Ticker; onSaved: () => void }) {
  const [ticker, setTicker] = useState<Ticker>(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(ticker) !== JSON.stringify(initial);
  const set = (patch: Partial<Ticker>) => setTicker((t) => ({ ...t, ...patch }));
  return <section className="grid gap-4">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold">Bandeau défilant</h2>
      <div className="flex items-center gap-2"><Label htmlFor="ticker-on" className="text-sm text-muted-foreground">{ticker.enabled ? 'Activé' : 'Désactivé'}</Label><Switch id="ticker-on" checked={ticker.enabled} onCheckedChange={(enabled) => set({ enabled })} /></div>
    </div>
    <div className="grid gap-2"><Label htmlFor="ticker-text">Texte du bandeau</Label><Textarea id="ticker-text" maxLength={500} rows={3} placeholder="Bienvenue • Promotion du jour -20 % • Ouvert 7j/7" value={ticker.text} onChange={(e) => set({ text: e.target.value })} /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2"><Label>Mode de défilement</Label><Select value={ticker.mode} onValueChange={(mode) => set({ mode: mode as Ticker['mode'] })}><SelectTrigger aria-label="Mode de défilement"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="loop">En continu</SelectItem><SelectItem value="once">1 passage par cycle</SelectItem></SelectContent></Select></div>
      <div className="grid gap-2"><Label>Temps de passage</Label><Select value={String(ticker.seconds)} onValueChange={(v) => set({ seconds: Number(v) })}><SelectTrigger aria-label="Temps de passage"><SelectValue /></SelectTrigger><SelectContent>{TICKER_SPEEDS.map((s) => <SelectItem key={s} value={String(s)}>{SPEED_LABELS[s]}</SelectItem>)}</SelectContent></Select></div>
    </div>
    {tickerVisible(ticker) && <div aria-label="Aperçu du bandeau" className="relative h-10 overflow-hidden rounded-md bg-foreground/80"><div key={`${ticker.seconds}:${ticker.mode}:${ticker.text}`} className="tv-ticker-text text-sm text-background" style={{ animationDuration: `${ticker.seconds}s`, animationIterationCount: ticker.mode === 'loop' ? 'infinite' : 1 }}>{ticker.text}</div></div>}
    <div><Button variant="outline" disabled={!dirty || saving} onClick={async () => {
      setSaving(true);
      try { await savePlaylistTicker(playlistId, ticker); onSaved(); toast.success('Bandeau enregistré'); }
      catch (error) { toast.error(error instanceof Error ? error.message : 'Le bandeau n’a pas pu être enregistré.'); }
      finally { setSaving(false); }
    }}>{saving ? 'Enregistrement…' : 'Enregistrer le bandeau'}</Button></div>
  </section>;
}
