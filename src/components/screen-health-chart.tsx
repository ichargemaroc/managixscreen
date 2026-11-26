import { PieChart, Pie, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { screenHealth, screenGroupCounts } from '@/lib/screen-health';
import type { Screen, Group } from '@/lib/store';

export function ScreenHealthChart({ screens, groups, filter, onFilter }: {
  screens: Screen[]; groups: Group[]; filter: string; onFilter: (id: string) => void;
}) {
  const health = screenHealth(screens);
  const slices = [
    { name: 'En ligne', value: health.online, color: 'var(--success)', dot: 'bg-success' },
    { name: 'Hors ligne', value: health.offline, color: 'var(--muted-foreground)', dot: 'bg-muted-foreground' },
    { name: 'En attente', value: health.pending, color: 'var(--warning)', dot: 'bg-warning' },
  ];
  return (
    <section aria-labelledby="screen-health-title" className="mb-6 border-b pb-6">
      <h2 id="screen-health-title" className="text-lg font-medium">État & santé du parc</h2>
      <div className="mt-4 grid items-center gap-6 lg:grid-cols-2">
        <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-start">
          <div className="relative size-[200px] shrink-0" role="img" aria-label={`${health.online} sur ${health.total} téléviseurs en ligne, ${health.percentage} %`}>
            <PieChart width={200} height={200} aria-hidden="true">
              <Pie data={health.total ? slices : [{ name: 'Aucune TV', value: 1 }]} dataKey="value" cx="50%" cy="50%" innerRadius={76} outerRadius={94} startAngle={90} endAngle={-270} stroke="var(--background)" strokeWidth={3} isAnimationActive={false}>
                {(health.total ? slices : [{ color: 'var(--muted)' }]).map((slice, index) => <Cell key={index} fill={slice.color} />)}
              </Pie>
            </PieChart>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <strong className="text-3xl font-medium tabular-nums">{health.percentage} %</strong>
              <span className="mt-1 text-xs text-muted-foreground">{health.online}/{health.total} en ligne</span>
            </div>
          </div>
          <dl className="min-w-36 space-y-3">
            {slices.map((slice) => <div key={slice.name} className="flex items-center gap-3 text-sm"><dt className="flex flex-1 items-center gap-2"><span className={`size-2 rounded-full ${slice.dot}`} />{slice.name}</dt><dd className="font-medium tabular-nums">{slice.value}</dd></div>)}
            <div className="flex justify-between gap-4 border-t pt-3 text-sm"><dt>Total TV</dt><dd className="font-medium tabular-nums">{health.total}</dd></div>
          </dl>
        </div>
        <div className="min-w-0">
          <h3 className="mb-3 text-sm font-medium">Répartition par groupe</h3>
          <div className="grid gap-1 sm:grid-cols-2">
            {[{ id: 'all', name: 'Tous les groupes', count: health.total }, ...screenGroupCounts(screens, groups)].map((group) => (
              <Button key={group.id} variant={filter === group.id ? 'secondary' : 'ghost'} aria-pressed={filter === group.id} onClick={() => onFilter(group.id)} className="h-auto min-h-10 min-w-0 justify-between gap-3 rounded-md px-3 py-2 text-left">
                <span className="min-w-0 whitespace-normal break-words">{group.name}</span><span className="shrink-0 tabular-nums">{group.count}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}