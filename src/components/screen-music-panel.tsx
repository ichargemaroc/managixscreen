import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Music2, Upload, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { screenMusicOptions, saveScreenMusic, removeScreenMusic, formatBytes } from '@/lib/store';
import { defaultMusicSettings, validateMusicFile, type MusicSettings } from '@/lib/background-music';

export function ScreenMusicPanel({ screenId }: { screenId: string }) {
  const query = useQuery(screenMusicOptions(screenId));
  if (query.isPending) return <section className="mt-8 border-t py-6 text-muted-foreground">Chargement de la musique…</section>;
  if (query.isError) return <section className="mt-8 border-t py-6"><p role="alert">Musique indisponible.</p><Button variant="outline" onClick={() => void query.refetch()}>Réessayer</Button></section>;
  return <MusicForm key={`${screenId}:${query.data?.track_id ?? 'none'}:${query.data?.enabled}:${query.data?.volume}:${query.data?.pause_on_video}`} screenId={screenId} track={query.data} />;
}

function MusicForm({ screenId, track }: { screenId: string; track: { name: string; size: number; enabled: boolean; volume: number; pause_on_video: boolean; previewUrl: string } | null }) {
  const client = useQueryClient(); const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | undefined>();
  const [settings, setSettings] = useState<MusicSettings>(track ? { enabled: track.enabled, volume: track.volume, pause_on_video: track.pause_on_video } : defaultMusicSettings);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const exists = Boolean(track || file);
  const act = async (remove = false) => {
    setBusy(true); setError('');
    try {
      if (remove) await removeScreenMusic(screenId); else await saveScreenMusic(screenId, settings, file);
      await client.invalidateQueries({ queryKey: ['screen-music', screenId] }); setFile(undefined);
      toast.success(remove ? 'Musique retirée' : 'Musique enregistrée');
    } catch (e) { setError(e instanceof Error ? e.message : 'La musique n’a pas pu être enregistrée.'); }
    finally { setBusy(false); }
  };
  return <section className="mt-8 space-y-5 border-t pt-6" aria-label="Musique de fond">
    <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Music2 className="size-5 text-primary" /> Musique de fond</h2>
    <input ref={input} type="file" accept=".mp3,audio/mpeg" className="hidden" aria-label="Fichier MP3" disabled={busy} onChange={async e => {
      const selected = e.target.files?.[0]; e.target.value = ''; if (!selected) return;
      try { await validateMusicFile(selected); setFile(selected); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Fichier non reconnu.'); }
    }} />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1"><p className="break-words font-medium">{file?.name ?? track?.name ?? 'Aucune musique'}</p><p className="text-sm text-muted-foreground">{file ? `${formatBytes(file.size)} · Non enregistré` : track ? formatBytes(track.size) : 'MP3 · 50 Mo maximum'}</p></div>
      <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}><Upload />{exists ? 'Remplacer le MP3' : 'Importer un MP3'}</Button>
    </div>
    {track?.previewUrl && !file && <audio controls preload="none" src={track.previewUrl} className="w-full" aria-label="Aperçu de la musique" />}
    <div className="flex items-center justify-between gap-4"><Label htmlFor={`music-enabled-${screenId}`}>Lecture en boucle</Label><Switch id={`music-enabled-${screenId}`} checked={settings.enabled} disabled={busy || !exists} onCheckedChange={enabled => setSettings(s => ({ ...s, enabled }))} /></div>
    <div className="space-y-3"><div className="flex justify-between"><Label>Volume</Label><span className="text-sm tabular-nums">{settings.volume} %</span></div><Slider aria-label="Volume de la musique" value={[settings.volume]} min={0} max={100} step={1} disabled={busy || !exists} onValueChange={values => { const volume = values[0]; if (volume !== undefined) setSettings(s => ({ ...s, volume })); }} /></div>
    <div className="flex items-center justify-between gap-4"><Label htmlFor={`music-video-${screenId}`}>Couper pendant les vidéos</Label><Switch id={`music-video-${screenId}`} checked={settings.pause_on_video} disabled={busy || !exists} onCheckedChange={pause_on_video => setSettings(s => ({ ...s, pause_on_video }))} /></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-3"><Button type="button" disabled={busy || !exists} onClick={() => void act()}><Save />{busy ? 'Enregistrement…' : 'Enregistrer la musique'}</Button>{track && <Button type="button" variant="outline" aria-label="Retirer la musique" disabled={busy} onClick={() => void act(true)}><Trash2 /></Button>}</div>
  </section>;
}