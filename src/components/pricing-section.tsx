import { useState } from 'react';
import { ArrowRight, Check, Minus, Monitor, Gift, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { annualTotal, annualSavings, displayMonthly, formatPrice, founderMonthly, enterpriseQuoteUrl, type PublicPricing } from '@/lib/public-pricing';

export function PricingSection({ pricing, onChoose, actionLabel = 'Commencer l’essai', actionDisabled = false }: { pricing: PublicPricing; onChoose: (id: string, cycle: 'monthly' | 'annual') => void; actionLabel?: string; actionDisabled?: boolean }) {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const currency = pricing.currency ?? 'MAD';
  const discount = pricing.annual_discount_percent ?? 0;
  const campaign = pricing.founders && pricing.founders.remaining > 0 ? pricing.founders : null;
  const plans = pricing.plans.filter(plan => !plan.quote_only).slice(0, 3);
  const enterprise = pricing.plans.find(plan => plan.quote_only);
  const format = (value: number) => formatPrice(value, currency);
  return <section id="tarifs" className="scroll-mt-8 bg-background px-5 py-12 sm:px-10 sm:py-16">
    <div className="mx-auto max-w-6xl">
      <div className="text-center"><p className="mb-3 text-sm font-medium text-primary">SCREENFLOW · TARIFS</p><h2 className="text-3xl font-medium">Un forfait à la taille de votre réseau</h2><p className="mx-auto mt-4 max-w-2xl text-muted-foreground">De vos premiers écrans à vos différents sites, choisissez votre capacité de diffusion.</p></div>
      {campaign && <div className="mt-8 flex flex-col items-center gap-2 border-y border-primary/30 bg-accent px-4 py-5 text-center text-accent-foreground" role="status"><Gift className="size-6" /><p className="font-medium">Offre Fondateurs : -{campaign.discount_percent} % pendant {campaign.months} mois (limité aux {campaign.limit} premiers comptes)</p><p className="text-sm">Essai gratuit de {pricing.trial_days} jours jusqu’à {pricing.trial_capacity} écrans via Screenflow Player (code ou QR code).</p></div>}
      {!campaign && <p className="mt-6 text-center text-sm text-muted-foreground">Essai gratuit de {pricing.trial_days} jours jusqu’à {pricing.trial_capacity} écrans via Screenflow Player (code ou QR code).</p>}
      <div className="mt-8 flex justify-center"><Tabs value={cycle} onValueChange={value => setCycle(value === 'annual' ? 'annual' : 'monthly')}><TabsList aria-label="Facturation" className="h-auto flex-wrap gap-1"><TabsTrigger value="monthly" className="min-h-10">Mensuel</TabsTrigger><TabsTrigger value="annual" className="min-h-10 whitespace-normal text-center">Annuel{Math.abs(discount - 100 * 2 / 12) < 0.01 ? ' · 2 mois offerts' : ` · -${discount} %`}</TabsTrigger></TabsList></Tabs></div>
      {cycle === 'annual' && <p className="mt-3 text-center text-xs text-muted-foreground">10 mois payés sur 12 · facturation annuelle</p>}
      <div className="mt-9 grid gap-5 md:grid-cols-3">
        {plans.map((plan, index) => {
          const highlighted = index === 1;
          const monthly = plan.monthly_amount / 100;
          return <article key={plan.id} aria-label={`Forfait ${plan.name}`} className={`relative flex min-w-0 flex-col rounded-lg border p-6 ${highlighted ? 'border-primary bg-accent/30 ring-1 ring-primary' : 'border-border bg-card'}`}>
            <div className="mb-5 flex min-h-6 items-center justify-between gap-2"><Monitor className="size-5 text-primary" />{highlighted && <span className="rounded bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">Le plus choisi</span>}</div>
            <h3 className="text-xl font-medium">{plan.name}</h3><p className="mt-2 text-sm text-muted-foreground">Jusqu’à {plan.capacity} écrans</p>
            <div className="mt-6 min-h-40" aria-live="polite">
              <p className="flex flex-wrap items-baseline gap-x-1"><strong className="text-3xl font-medium tabular-nums">{format(cycle === 'annual' ? annualTotal(plan.monthly_amount, discount) : monthly)}</strong><span className="text-sm text-muted-foreground">/{cycle === 'annual' ? 'an' : 'mois'}</span></p>
              {cycle === 'annual' ? <><p className="mt-3 text-sm text-muted-foreground">Soit {format(displayMonthly(plan.monthly_amount, 'annual', discount))}/mois</p><p className="mt-2 text-sm font-medium text-primary">Économisez {format(annualSavings(plan.monthly_amount, discount))}/an</p></> : <><p className="mt-3 text-sm text-muted-foreground">{format(Math.round(monthly / plan.capacity * 100) / 100)} / écran</p>{campaign && <div className="mt-4 border-l-2 border-primary pl-3"><p className="text-xs text-muted-foreground">Fondateurs · -{campaign.discount_percent} %</p><p className="mt-1 text-lg font-medium text-primary">{format(founderMonthly(plan.monthly_amount, campaign.discount_percent))}<span className="text-xs font-normal">/mois pendant {campaign.months} mois</span></p></div>}</>}
            </div>
            <ul className="mb-6 flex-1 space-y-3 text-sm">{plan.features.map(feature => <li key={feature} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" /><span>{feature}</span></li>)}</ul>
            <Button variant={highlighted ? 'default' : 'outline'} className="w-full" disabled={actionDisabled} title={actionDisabled ? 'Paiement en ligne pas encore raccordé' : undefined} onClick={() => onChoose(plan.id, cycle)}>{actionLabel}<ArrowRight /></Button>
          </article>;
        })}
      </div>
      {enterprise && <div className="mt-8 grid items-center gap-6 border-y border-border py-7 md:grid-cols-[1fr_auto]"><div><h3 className="text-xl font-medium">Enterprise ({enterprise.capacity}+ écrans)</h3><p className="mt-2 text-muted-foreground">À partir de <strong className="font-medium text-foreground">{format(enterprise.monthly_amount / 100)}/mois</strong> · À partir de 100 écrans : sur devis.</p><p className="mt-2 text-sm text-muted-foreground">Une offre adaptée aux grands parcs et à votre organisation multi-sites.</p></div><Button variant="outline" asChild><a href={enterpriseQuoteUrl}><Mail />Demander un devis</a></Button></div>}
      <div className="mt-5 space-y-2 text-center text-xs text-muted-foreground"><p>Prix en MAD, hors taxes. Sans carte bancaire pendant l’essai.</p>{campaign && <p>Offre Fondateurs réservée aux nouveaux comptes éligibles, sur le mensuel ; non cumulable avec la remise annuelle. Les 6 mois débutent au premier abonnement mensuel payant.</p>}<p>Paiement en ligne non activé : aucune facturation automatique. Les conditions des comptes existants restent inchangées.</p></div>
      <div className="mt-14"><h3 className="text-center text-2xl font-medium">Comparez les offres</h3><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><caption className="sr-only">Fonctionnalités incluses dans les offres Screenflow</caption><thead><tr className="border-b border-border"><th scope="col" className="py-4 pr-4 text-left font-medium">Inclus</th>{pricing.plans.map(plan => <th key={plan.id} scope="col" className="px-3 py-4 text-center font-medium">{plan.name}</th>)}</tr></thead><tbody>
        <tr className="border-b border-border"><th scope="row" className="py-4 text-left font-normal">Écrans TV Android</th>{pricing.plans.map(plan => <td key={plan.id} className="px-3 py-4 text-center">{plan.capacity}{plan.quote_only ? '+' : ''}</td>)}</tr>
        <tr className="border-b border-border"><th scope="row" className="py-4 text-left font-normal">Playlists</th>{pricing.plans.map(plan => <td key={plan.id} className="px-3 py-4 text-center">{plan.comparison.playlists ?? 'Incluses'}</td>)}</tr>
        {(['web', 'groups', 'walls'] as const).map(key => <tr key={key} className="border-b border-border"><th scope="row" className="py-4 text-left font-normal">{key === 'web' ? 'Pages Web' : key === 'groups' ? 'Groupes d’écrans' : 'Murs d’écrans'}</th>{pricing.plans.map(plan => <td key={plan.id} className="px-3 py-4 text-center">{plan.comparison[key] ? <Check aria-label="Inclus" className="mx-auto size-5 text-primary" /> : <Minus aria-label="Non inclus" className="mx-auto size-4 text-muted-foreground" />}</td>)}</tr>)}
      </tbody></table></div><p className="mt-3 text-xs text-muted-foreground">Les murs d’écrans utilisent une synchronisation logicielle, sans garantie de verrouillage image par image.</p></div>
      <div className="mx-auto mt-12 max-w-3xl"><h3 className="mb-4 text-center text-2xl font-medium">Vos questions sur les tarifs</h3>{[
        ['Comment fonctionne l’essai gratuit ?', `Vous disposez de ${pricing.trial_days} jours pour diffuser sur jusqu’à ${pricing.trial_capacity} écrans avec Screenflow Player. Le jumelage se fait par code ou QR code, sans carte bancaire.`],
        ['Faut-il un boîtier supplémentaire ?', 'Non pour une TV Android ou Google TV compatible : installez directement Screenflow Player. Les TV Samsung Tizen et LG webOS nécessitent un appareil Android TV externe.'],
        ['Puis-je afficher tous les sites Web ?', 'Certains sites limitent ou interdisent leur affichage intégré. Le résultat dépend des autorisations du site ; ces restrictions ne peuvent pas être contournées.'],
      ].map(([question, answer]) => <details key={question} className="border-b border-border py-4"><summary className="cursor-pointer font-medium">{question}</summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p></details>)}</div>
    </div>
  </section>;
}