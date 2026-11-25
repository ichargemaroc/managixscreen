import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { savePlaylistTicker } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { TICKER_SPEEDS, tickerBackground, tickerVisible, type Ticker } from '@/lib/ticker';

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
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2"><Label>Hauteur du bandeau : {ticker.height} %</Label><Slider aria-label="Hauteur du bandeau" min={4} max={20} step={1} value={[ticker.height]} onValueChange={([v]) => set({ height: v ?? 7 })} /></div>
      <div className="grid gap-2"><Label>Taille du texte : {ticker.textSize} %</Label><Slider aria-label="Taille du texte" min={2} max={10} step={0.2} value={[ticker.textSize]} onValueChange={([v]) => set({ textSize: Math.round((v ?? 3.6) * 10) / 10 })} /></div>
      <div className="grid gap-2"><Label>Opacité du fond : {ticker.opacity} %</Label><Slider aria-label="Opacité du fond" min={0} max={100} step={5} value={[ticker.opacity]} onValueChange={([v]) => set({ opacity: v ?? 75 })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2"><Label htmlFor="ticker-bg">Couleur du fond</Label><Input id="ticker-bg" type="color" className="h-10 p-1" value={ticker.background} onChange={(e) => set({ background: e.target.value })} /></div>
        <div className="grid gap-2"><Label htmlFor="ticker-fg">Couleur du texte</Label><Input id="ticker-fg" type="color" className="h-10 p-1" value={ticker.textColor} onChange={(e) => set({ textColor: e.target.value })} /></div>
      </div>
    </div>
    {tickerVisible(ticker) && <div aria-label="Aperçu du bandeau" className="relative aspect-video overflow-hidden rounded-md bg-muted [container-type:size]"><div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ height: `${ticker.height}%`, background: tickerBackground(ticker), color: ticker.textColor }}><div key={`${ticker.seconds}:${ticker.mode}:${ticker.text}`} className="tv-ticker-text" style={{ animationDuration: `${ticker.seconds}s`, animationIterationCount: ticker.mode === 'loop' ? 'infinite' : 1, fontSize: `${ticker.textSize * 0.9}cqh` }}>{ticker.text}</div></div></div>}
    <div><Button variant="outline" disabled={!dirty || saving} onClick={async () => {
      setSaving(true);
      try { await savePlaylistTicker(playlistId, ticker); onSaved(); toast.success('Bandeau enregistré'); }
      catch (error) { toast.error(error instanceof Error ? error.message : 'Le bandeau n’a pas pu être enregistré.'); }
      finally { setSaving(false); }
    }}>{saving ? 'Enregistrement…' : 'Enregistrer le bandeau'}</Button></div>
  </section>;
}
