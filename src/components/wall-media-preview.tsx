import { useRef, useState } from 'react';
import { Monitor, Move, RotateCcw, ZoomIn, ZoomOut, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { wallMediaRect, wallViewport, moveWallMedia, type WallConfig } from '@/lib/video-wall';
import type { Media } from '@/lib/store';

export function WallMediaPreview({ config, media, onChange }: { config: WallConfig; media: Media | undefined; onChange?: (placement: Partial<Pick<WallConfig, 'media_x' | 'media_y' | 'media_scale'>>) => void }) {
  const [dimensions, setDimensions] = useState({ width: 1, height: 1, id: '' });
  const drag = useRef<{ pointer: number; x: number; y: number; width: number; height: number; media_x: number; media_y: number } | null>(null);
  const ready = Boolean(media && dimensions.id === media.id);
  const scalePercent = Math.round((config.media_scale ?? 1) * 100);
  const changeScale = (percent: number) => onChange?.({ media_scale: Math.max(10, Math.min(300, percent)) / 100 });
  const rect = wallMediaRect(config, dimensions.width, dimensions.height);
  const positioned = { left: `${rect.x / config.width * 100}%`, top: `${rect.y / config.height * 100}%`, width: `${rect.width / config.width * 100}%`, height: `${rect.height / config.height * 100}%` };
  return <div className="space-y-2">
    {onChange && media?.type !== 'webpage' && <div className="flex flex-wrap items-center justify-end gap-1">
      <span className="mr-auto text-sm text-muted-foreground">Taille de l’image</span>
      <Button variant="ghost" size="icon" title="Réduire" aria-label="Réduire l’image" disabled={!media || scalePercent <= 10} onClick={() => changeScale(scalePercent - 10)}><ZoomOut /></Button>
      <Slider className="w-24 sm:w-36" min={10} max={300} step={1} value={[scalePercent]} disabled={!media} aria-label="Taille proportionnelle de l’image" onValueChange={values => { const value = values[0]; if (value !== undefined) changeScale(value); }} />
      <Button variant="ghost" size="icon" title="Agrandir" aria-label="Agrandir l’image" disabled={!media || scalePercent >= 300} onClick={() => changeScale(scalePercent + 10)}><ZoomIn /></Button>
      <Button variant="ghost" className="w-16 tabular-nums" title="Rétablir la taille à 100 %" aria-label="Rétablir la taille de l’image" disabled={!media} onClick={() => changeScale(100)}>{scalePercent} %</Button>
      <Button variant="ghost" size="icon" title="Déplacer l’image" aria-label="Déplacer l’image" disabled={!media} onClick={() => document.querySelector<HTMLElement>('[aria-label="Position du contenu sur le mur"]')?.focus()}><Move /></Button>
      <Button variant="ghost" size="icon" title="Recentrer" aria-label="Recentrer l’image" disabled={!media} onClick={() => onChange({ media_x: 0, media_y: 0 })}><RotateCcw /></Button>
    </div>}
    <div className={`wall-preview ${onChange && media ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
      style={{ aspectRatio: `${config.width}/${config.height}` }}
      tabIndex={onChange && media ? 0 : undefined} aria-label={onChange ? 'Position du contenu sur le mur' : undefined}
      onKeyDown={event => {
        if (!onChange || !media || media.type === 'webpage' || !event.key.startsWith('Arrow')) return;
        event.preventDefault();
        onChange(moveWallMedia({ media_x: config.media_x ?? 0, media_y: config.media_y ?? 0 }, event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0, event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0, 100, 100));
      }}
      onPointerDown={event => {
        if (!onChange || !media || media.type === 'webpage' || event.button !== 0) return;
        event.preventDefault(); event.currentTarget.focus();
        const box = event.currentTarget.getBoundingClientRect();
        drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, width: box.width, height: box.height, media_x: config.media_x ?? 0, media_y: config.media_y ?? 0 };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        const start = drag.current;
        if (start && start.pointer === event.pointerId && onChange) onChange(moveWallMedia(start, event.clientX - start.x, event.clientY - start.y, start.width, start.height));
      }}
      onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => { drag.current = null; }}>
      {media ? media.type === 'webpage' ? <div className="flex flex-col items-center gap-3 py-12 text-primary"><Globe className="size-10" /><span className="text-sm">{media.name}</span></div> : media.type === 'image' ? <img key={media.id} src={media.url} alt={media.name} draggable={false} className="pointer-events-none select-none" style={ready ? positioned : undefined} onLoad={event => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight, id: media.id })} /> : <video key={media.id} src={media.url} muted playsInline preload="metadata" className="pointer-events-none" style={ready ? positioned : undefined} onLoadedMetadata={event => setDimensions({ width: event.currentTarget.videoWidth, height: event.currentTarget.videoHeight, id: media.id })} /> : <Monitor className="size-10 text-muted-foreground" />}
      <div className="absolute inset-0 pointer-events-none">{Array.from({ length: config.rows * config.columns }, (_, index) => {
        const viewport = wallViewport({ ...config, row_index: Math.floor(index / config.columns), column_index: index % config.columns });
        return <span className="absolute border border-primary" key={index} style={{ left: `${viewport.x / config.width * 100}%`, top: `${viewport.y / config.height * 100}%`, width: `${viewport.width / config.width * 100}%`, height: `${viewport.height / config.height * 100}%` }} />;
      })}</div>
    </div>
    {media?.type === 'webpage' && <p className="text-sm text-muted-foreground">Chaque TV affiche la page complète ; découpage et synchronisation du contenu Web non garantis.</p>}
  </div>;
}