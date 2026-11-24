import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';

// Dedicated module: older store modules need only their established useStore export.
export function StoreContent({ children }: { children: ReactNode }) {
  const { loading, loadError, retry } = useStore();
  if (loadError) return <div role="alert" className="p-8 text-center"><p>Les données n’ont pas pu être chargées.</p><Button className="mt-4" onClick={retry}>Réessayer</Button></div>;
  if (loading) return <div role="status" aria-label="Chargement des données" className="mx-auto max-w-7xl space-y-8">
    <div aria-hidden="true" className="h-9 w-56 rounded bg-muted motion-safe:animate-pulse" />
    <div aria-hidden="true" className="grid grid-cols-2 gap-8 border-b pb-9 md:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <div key={i} className="space-y-4 motion-safe:animate-pulse"><div className="size-12 rounded-full bg-muted" /><div className="h-4 w-24 rounded bg-muted" /><div className="h-9 w-12 rounded bg-muted" /></div>)}</div>
    <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-10 rounded bg-muted" />)}</div>
  </div>;
  return children;
}