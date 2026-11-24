import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SLIDE_TRANSITIONS, SLIDE_TRANSITION_LABELS, type SlideTransition } from '@/lib/slide-transition';

export function SlideTransitionSelect({ value, onChange, disabled = false }: { value: SlideTransition; onChange: (v: SlideTransition) => void; disabled?: boolean }) {
  return <div className="space-y-2"><Label htmlFor="slide-transition">Animation entre les diapositives</Label>
    <Select value={value} onValueChange={v => onChange(v as SlideTransition)} disabled={disabled}><SelectTrigger id="slide-transition" className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>{SLIDE_TRANSITIONS.map(t => <SelectItem key={t} value={t}>{SLIDE_TRANSITION_LABELS[t]}</SelectItem>)}</SelectContent></Select></div>;
}
