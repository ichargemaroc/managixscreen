import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DEFAULT_ITEM_SCHEDULE, itemSettingsSchema, type ItemSettings } from '@/lib/playlist-item-settings';
import { SLIDE_TRANSITIONS, SLIDE_TRANSITION_LABELS, type SlideTransition } from '@/lib/slide-transition';

export type ItemSettingMode = 'daily' | 'periodic' | 'transition';
const titles = { daily: 'Heures d’affichage quotidiennes', periodic: 'Affichage périodique', transition: 'Transition personnalisée' };
export function PlaylistItemSettingsDialog({ mode, initial, name, playlistName, onClose, onSave }: {
  mode: ItemSettingMode; initial: ItemSettings; name: string; playlistName: string;
  onClose: () => void; onSave: (settings: ItemSettings) => Promise<void>;
}) {
  const [schedule, setSchedule] = useState(initial.schedule ?? DEFAULT_ITEM_SCHEDULE);
  const [transition, setTransition] = useState<SlideTransition | null>(initial.transition);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const parsed = itemSettingsSchema.safeParse({ schedule, transition });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Réglages invalides'); return; }
    setSaving(true);
    try { await onSave(parsed.data); onClose(); toast.success('Réglages du média enregistrés'); }
    catch { toast.error('Les réglages n’ont pas pu être enregistrés'); }
    finally { setSaving(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>{titles[mode]}</DialogTitle><DialogDescription className="break-words">{name} · Playlist « {playlistName} ». Ces réglages s’appliquent à toutes les TV qui diffusent cette playlist.</DialogDescription></DialogHeader>
    <div className="space-y-5">
      {mode !== 'transition' && <div className="space-y-2"><Label htmlFor="item-timezone">Fuseau horaire</Label><Input id="item-timezone" value={schedule.timezone} maxLength={100} onChange={event => setSchedule({ ...schedule, timezone: event.target.value })} /></div>}
      {mode === 'daily' && <>
        <div className="flex items-center justify-between gap-3"><Label htmlFor="item-daily-enabled">Limiter les heures d’affichage</Label><Switch id="item-daily-enabled" checked={schedule.daily.enabled} onCheckedChange={enabled => setSchedule({ ...schedule, daily: { ...schedule.daily, enabled } })} /></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="item-start-time">Début</Label><Input id="item-start-time" type="time" disabled={!schedule.daily.enabled} value={schedule.daily.start} onChange={event => setSchedule({ ...schedule, daily: { ...schedule.daily, start: event.target.value } })} /></div><div className="space-y-2"><Label htmlFor="item-end-time">Fin</Label><Input id="item-end-time" type="time" disabled={!schedule.daily.enabled} value={schedule.daily.end} onChange={event => setSchedule({ ...schedule, daily: { ...schedule.daily, end: event.target.value } })} /></div></div>
      </>}
      {mode === 'periodic' && <>
        <div className="flex items-center justify-between gap-3"><Label htmlFor="item-periodic-enabled">Limiter la période et les jours</Label><Switch id="item-periodic-enabled" checked={schedule.periodic.enabled} onCheckedChange={enabled => setSchedule({ ...schedule, periodic: { ...schedule.periodic, enabled } })} /></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="min-w-0 space-y-2"><Label htmlFor="item-start-date">Du</Label><Input id="item-start-date" className="min-w-0" type="date" disabled={!schedule.periodic.enabled} value={schedule.periodic.startDate ?? ''} onChange={event => setSchedule({ ...schedule, periodic: { ...schedule.periodic, startDate: event.target.value || null } })} /></div><div className="min-w-0 space-y-2"><Label htmlFor="item-end-date">Au</Label><Input id="item-end-date" className="min-w-0" type="date" disabled={!schedule.periodic.enabled} value={schedule.periodic.endDate ?? ''} onChange={event => setSchedule({ ...schedule, periodic: { ...schedule.periodic, endDate: event.target.value || null } })} /></div></div>
        <fieldset disabled={!schedule.periodic.enabled} className="grid grid-cols-2 gap-3 sm:grid-cols-4"><legend className="mb-3 text-sm font-medium">Jours d’affichage</legend>{['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((label, day) => <Label key={day} className="flex items-center gap-2"><Checkbox disabled={!schedule.periodic.enabled} checked={schedule.periodic.days.includes(day)} onCheckedChange={checked => setSchedule({ ...schedule, periodic: { ...schedule.periodic, days: checked ? [...schedule.periodic.days, day] : schedule.periodic.days.filter(value => value !== day) } })} />{label}</Label>)}</fieldset>
      </>}
      {mode === 'transition' && <div className="space-y-2"><Label htmlFor="item-transition">Transition à l’arrivée de ce média</Label><Select value={transition ?? 'inherit'} onValueChange={value => setTransition(value === 'inherit' ? null : value as SlideTransition)}><SelectTrigger id="item-transition" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inherit">Utiliser celle de la playlist</SelectItem>{SLIDE_TRANSITIONS.map(value => <SelectItem key={value} value={value}>{SLIDE_TRANSITION_LABELS[value]}</SelectItem>)}</SelectContent></Select></div>}
    </div>
    <DialogFooter><Button variant="outline" disabled={saving} onClick={onClose}>Annuler</Button><Button disabled={saving} onClick={() => void save()}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button></DialogFooter>
  </DialogContent></Dialog>;
}