import { z } from 'zod';

export const SLIDE_TRANSITIONS = ['default','fade','zoom','spin','slide-right','slide-left','bounce','scale','rotate','blink','random'] as const;
export const slideTransitionSchema = z.enum(SLIDE_TRANSITIONS);
export type SlideTransition = z.infer<typeof slideTransitionSchema>;
export const SLIDE_TRANSITION_LABELS: Record<SlideTransition, string> = {
  default: 'Défaut', fade: 'Disparaître', zoom: 'Zoom', spin: 'Rotation complète', 'slide-right': 'Glisser depuis la droite',
  'slide-left': 'Glisser depuis la gauche', bounce: 'Rebond', scale: 'Agrandir', rotate: 'Pivoter', blink: 'Clignoter', random: 'Aléatoire',
};
const concrete = SLIDE_TRANSITIONS.filter(t => t !== 'default' && t !== 'random');

/** Resolves the CSS animation for one slide; random picks deterministically per slide key. */
export function resolveSlideTransition(value: SlideTransition, key: string): Exclude<SlideTransition, 'random'> {
  if (value !== 'random') return value;
  let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return concrete[h % concrete.length]!;
}
