import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { publicPricingOptions } from '@/lib/store';
import { PricingSection } from '@/components/pricing-section';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import logo from '@/assets/screenflow-logo.webp.asset.json';

export const Route = createFileRoute('/tarifs')({
  head: () => ({ meta: [
    { title: 'Tarifs Screenflow — Forfaits TV Android en MAD' },
    { name: 'description', content: 'Comparez Starter, Pro, Business et Enterprise : tarifs en MAD, mensuel ou annuel, offre Fondateurs et essai gratuit de 14 jours.' },
    { property: 'og:title', content: 'Tarifs Screenflow — Votre réseau, votre forfait' },
    { property: 'og:description', content: 'Forfaits en dirhams marocains pour piloter vos TV Android. Essai gratuit, comparaison des offres et devis Enterprise.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(publicPricingOptions),
  component: PricingPage,
});

function PricingPage() {
  const { data } = useSuspenseQuery(publicPricingOptions);
  const navigate = useNavigate();
  return <div className="min-h-screen bg-background"><header className="mx-auto flex max-w-6xl items-center justify-between gap-4 border-b border-border px-5 py-5"><Link to="/auth"><img src={logo.url} alt="Screenflow" className="h-9 w-auto max-w-32 object-contain" /></Link><div className="flex items-center gap-2"><ThemeToggle /><Button variant="ghost" asChild><Link to="/auth"><ArrowLeft />Accueil</Link></Button></div></header><main><PricingSection pricing={data} onChoose={(id, cycle) => {
    try { sessionStorage.setItem('screenflow:chosen-plan', id); sessionStorage.setItem('screenflow:chosen-cycle', cycle); } catch { /* optional preference */ }
    void navigate({ to: '/auth', search: { signup: true } });
  }} /></main></div>;
}