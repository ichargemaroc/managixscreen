import { positionColor, type PositionTest } from '@/lib/position-test';

export function PositionStage({ test, now }: { test: PositionTest; now: number }) {
  return <section aria-label="Test de position" className={`tv-position-test ${positionColor(test.number)}`}>
    <p>{test.wall_name}</p>
    <strong>{test.number}</strong>
    <p>{test.screen_name}</p>
    <p className="position-label">LIGNE {test.row_index + 1} — COLONNE {test.column_index + 1}</p>
    <small>Retour à la diffusion · {Math.max(0, Math.ceil((test.deadline - now) / 1000))} s</small>
  </section>;
}