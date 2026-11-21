import { useState } from 'react';
import { Globe, Save, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { saveWebpage, useStore, type Media } from '@/lib/store';
import { webpageSchema } from '@/lib/webpage';
import { WebpagePreview } from './webpage-preview';

export function WebpageEditor({ media }: { media?: Media }) {
  const { refresh } = useStore(); const [open, setOpen] = useState(false); const [test, setTest] = useState(false);
  const [name, setName] = useState(media?.name ?? ''); const [url, setUrl] = useState(media?.url ?? '');
  const [duration, setDuration] = useState(media?.duration ?? 30); const [minutes, setMinutes] = useState(media?.refreshMinutes ?? 0);
  const [fullscreen, setFullscreen] = useState(media?.fullscreen ?? true); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const config = () => webpageSchema.safeParse({ name, url, duration, refreshMinutes: minutes, fullscreen });
  const validate = () => { const parsed = config(); if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Source invalide.'); return null; } setError(''); return parsed.data; };
  return <><Button variant={media ? 'ghost' : 'outline'} size={media ? 'icon' : 'default'} aria-label={media ? 'Modifier la page Web' : 'Ajouter une page Web'} onClick={() => setOpen(true)}>{media ? <Pencil /> : <Globe />}{!media && 'Page Web'}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90svh] overflow-y-auto"><DialogHeader><DialogTitle>{media ? 'Modifier la page Web' : 'Ajouter une page Web'}</DialogTitle></DialogHeader><div className="space-y-4">
      <div className="space-y-2"><Label htmlFor="web-name">Nom de la source</Label><Input id="web-name" value={name} maxLength={120} onChange={e => setName(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="web-url">URL de la page</Label><Input id="web-url" type="url" placeholder="https://exemple.fr" value={url} onChange={e => { setUrl(e.target.value); setTest(false); }} /></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="web-duration">Durée (secondes)</Label><Input id="web-duration" type="number" min={1} max={86400} value={duration} onChange={e => setDuration(Number(e.target.value))} /></div><div className="space-y-2"><Label htmlFor="web-refresh">Actualisation (minutes)</Label><Input id="web-refresh" type="number" min={0} max={1440} value={minutes} onChange={e => setMinutes(Number(e.target.value))} /><p className="text-xs text-muted-foreground">0 : désactivée</p></div></div>
      <div className="flex items-center justify-between"><Label htmlFor="web-fullscreen">Plein écran</Label><Switch id="web-fullscreen" checked={fullscreen} onCheckedChange={setFullscreen} /></div>
      {url.startsWith('http:') && <p className="text-sm text-destructive">Connexion non chiffrée : cette adresse peut être enregistrée, mais Android TV exige HTTPS.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { if (validate()) setTest(true); }}><Globe />Tester</Button><Button disabled={busy} onClick={async () => { const value = validate(); if (!value) return; setBusy(true); try { await saveWebpage(media?.id ?? null, value); refresh(); setOpen(false); } catch { setError('La page Web n’a pas pu être enregistrée.'); } finally { setBusy(false); } }}><Save />Enregistrer</Button></div>
      {test && <WebpagePreview url={url} name={name} />}
    </div></DialogContent></Dialog></>;
}