import { z } from 'zod';
import { slideTransitionSchema } from './slide-transition';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
export const itemScheduleSchema = z.object({
  timezone: z.string().max(100).refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } }),
  daily: z.object({ enabled: z.boolean(), start: time, end: time }).refine(value => !value.enabled || value.start !== value.end, 'Les deux heures doivent être différentes.'),
  periodic: z.object({ enabled: z.boolean(), startDate: date.nullable(), endDate: date.nullable(), days: z.array(z.number().int().min(0).max(6)).max(7) }).refine(value => !value.enabled || (value.startDate !== null && value.endDate !== null && value.startDate <= value.endDate && value.days.length > 0), 'Sélectionnez une période valide et au moins un jour.'),
});
export type ItemSchedule = z.infer<typeof itemScheduleSchema>;
export const DEFAULT_ITEM_SCHEDULE: ItemSchedule = { timezone: 'Africa/Casablanca', daily: { enabled: false, start: '08:00', end: '18:00' }, periodic: { enabled: false, startDate: null, endDate: null, days: [0, 1, 2, 3, 4, 5, 6] } };
export const itemSettingsSchema = z.object({ schedule: itemScheduleSchema.nullable(), transition: slideTransitionSchema.nullable() });
export type ItemSettings = z.infer<typeof itemSettingsSchema>;

/** Evaluate the cached schedule with the corrected device clock, without network access. */
export function itemIsActive(schedule: ItemSchedule | null | undefined, now: number): boolean {
  if (!schedule) return true;
  const parsed = itemScheduleSchema.safeParse(schedule);
  if (!parsed.success) return false;
  const s = parsed.data;
  if (!s.daily.enabled && !s.periodic.enabled) return true;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: s.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  const localDate = `${get('year')}-${get('month')}-${get('day')}`;
  const clock = `${get('hour')}:${get('minute')}`;
  let anchor = new Date(`${localDate}T12:00:00Z`);
  if (s.daily.enabled) {
    const overnight = s.daily.start > s.daily.end;
    if (overnight ? !(clock >= s.daily.start || clock < s.daily.end) : !(clock >= s.daily.start && clock < s.daily.end)) return false;
    if (overnight && clock < s.daily.end) anchor = new Date(anchor.getTime() - 86400000);
  }
  if (!s.periodic.enabled) return true;
  const day = (anchor.getUTCDay() + 6) % 7;
  const dateKey = anchor.toISOString().slice(0, 10);
  return s.periodic.startDate !== null && s.periodic.endDate !== null && dateKey >= s.periodic.startDate && dateKey <= s.periodic.endDate && s.periodic.days.includes(day);
}