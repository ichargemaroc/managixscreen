import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DISPLAY_ROTATIONS, type DisplayRotation } from '@/lib/display-rotation';

const labels: Record<DisplayRotation, string> = { 0: 'Standard', 90: 'Vers la droite', 180: 'Inversé', 270: 'Vers la gauche' };

export function DisplayRotationPicker({ value, onChange, disabled = false }: { value: DisplayRotation; onChange: (value: DisplayRotation) => void; disabled?: boolean }) {
  return <section className="@container space-y-4 py-3" aria-labelledby="display-rotation-title">
    <h2 id="display-rotation-title" className="flex items-center gap-2 text-base font-semibold"><RotateCw className="size-5 text-muted-foreground" />Rotation de l’écran</h2>
    <div className="grid grid-cols-2 gap-3 @min-[600px]:grid-cols-4" role="group" aria-label="Rotation de l’écran">
      {DISPLAY_ROTATIONS.map(rotation => <Button key={rotation} type="button" variant="outline" disabled={disabled} aria-pressed={value === rotation} aria-label={`${rotation}° — ${labels[rotation]}`} onClick={() => onChange(rotation)} className={`display-rotation-option ${value === rotation ? 'display-rotation-selected' : ''}`}>
        <span className="display-rotation-icon" aria-hidden="true"><span className={`display-rotation-screen display-rotation-${rotation}`}><span /></span></span>
        <span className="text-2xl font-semibold">{rotation}°</span>
        <span className="text-sm font-normal text-muted-foreground">{labels[rotation]}</span>
      </Button>)}
    </div>
  </section>;
}