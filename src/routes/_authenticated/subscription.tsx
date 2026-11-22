import { createFileRoute, Link } from '@tanstack/react-router';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CreditCard, Monitor, ArrowUpRight, ArrowDownRight, Settings, Ban, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { billingQueryOptions, planDowngrade, useStore } from '@/lib/store';
import { annualAmount, availablePlaces, billingDate, billingMoney, BILLING_LABELS, keepSelectionNeeded, monthlyEquivalentLabel, nextCapacity, trialDaysLeft, type BillingPlan } from '@/lib/billing';
import { PageHeader } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const Route = createFileRoute('/_authenticated/subscription')({
  head: () => ({ meta: [{ title: 'Abonnement et capacité — ScreenFlow' }, { name: 'description', content: 'Votre forfait Screenflow, vos places disponibles et votre historique de facturation.' }, { property: 'og:title', content: 'Abonnement et capacité — ScreenFlow' }, { property: 'og:description', content: 'Gérez la capacité de vos Players et consultez votre abonnement.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(billingQueryOptions),
  component: Subscription,
});

const NO_PROVIDER = 'Paiement en ligne pas encore raccordé';

function Subscription() {
  const { data } = useSuspenseQuery(billingQueryOptions);
  const [interval, setInterval] = useState('month');
  const [downgrade, setDowngrade] = useState<BillingPlan | null>(null);
  const queryClient = useQueryClient();
  const { subscription: sub, settings, plans, used } = data;
  const current = plans.find((p) => p.id === sub.plan_id);
  const scheduled = plans.find((p) => p.id === sub.scheduled_plan_id);
  const allowance = sub.capacity + sub.complimentary_screens;
  const next = nextCapacity(allowance, plans);
  const isTrial = sub.status === 'trial' && sub.trial_ends_at !== null && !sub.legacy_access;
  const daysLeft = isTrial ? trialDaysLeft(sub.trial_ends_at) : null;
  const trialOver = isTrial && daysLeft === 0;
  const paid = sub.status === 'active' && sub.amount !== null && !sub.legacy_access;
  const title = sub.legacy_access ? 'Accès historique' : isTrial ? 'Essai gratuit' : current?.name ?? (sub.status === 'active' ? 'Abonnement spécial' : 'Aucun forfait attribué');
  const freeMonths = monthlyEquivalentLabel(settings.annual_discount_percent);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['billing-account'] });
  const price = (plan: BillingPlan) => interval === 'year' && plan.monthly_amount !== null && settings.annual_discount_percent !== null ? billingMoney(annualAmount(plan.monthly_amount, settings.annual_discount_percent), settings.currency) : interval === 'year' ? 'Tarif annuel à configurer' : billingMoney(plan.monthly_amount, settings.currency);

  return <div className="mx-auto max-w-7xl">
    <PageHeader title="Abonnement" description="Votre offre et la capacité de votre réseau d’écrans." action={<Button variant="outline" asChild><Link to="/screens"><Monitor /> Mes écrans</Link></Button>} />
    <div className="mb-6 flex flex-wrap items-center gap-3 border-b pb-5 text-sm"><CreditCard className="size-5 text-muted-foreground" /><p>Paiement en ligne pas encore raccordé — aucune facturation automatique n’est active.</p>{data.is_admin && <Button asChild variant="outline" size="sm"><Link to="/billing-admin">Administration <ArrowUpRight /></Link></Button>}</div>
    {isTrial && <div role="status" className={`mb-6 flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm ${trialOver ? 'border-destructive text-destructive' : ''}`}><Clock className="size-5" />{trialOver ? <p>Votre essai gratuit s’est terminé le {billingDate(sub.trial_ends_at)}. Vos écrans, médias et playlists sont conservés ; choisissez un forfait pour ajouter de nouveaux écrans.</p> : <p><strong>{daysLeft} jour{daysLeft === 1 ? '' : 's'} d’essai restant{daysLeft === 1 ? '' : 's'}</strong> · fin le {billingDate(sub.trial_ends_at)} · jusqu’à {sub.capacity} écrans, sans carte bancaire.</p>}</div>}
    {sub.status === 'past_due' && <div role="alert" className="mb-6 flex items-center gap-3 rounded-lg border border-destructive p-4 text-sm text-destructive"><AlertTriangle className="size-5" /><p>Paiement en retard. Mettez à jour votre moyen de paiement avant le {billingDate(sub.grace_until)} ; vos données ne seront pas supprimées.</p></div>}
    <section className="grid gap-8 border-b pb-8 md:grid-cols-2">
      <div><p className="mb-2 text-sm text-muted-foreground">Votre offre</p><h2 className="text-2xl font-medium">{title}</h2><p className="mt-2 text-sm text-muted-foreground">Statut : {sub.legacy_access ? 'Accès existant conservé · non facturé' : isTrial ? (trialOver ? 'Essai terminé' : 'Essai en cours') : BILLING_LABELS[sub.status]}</p><p className="mt-5 text-2xl tabular-nums">{sub.amount !== null ? billingMoney(sub.amount, sub.currency) : 'Non facturé'}{sub.amount !== null && <span className="text-sm text-muted-foreground"> / {sub.interval === 'year' ? 'an' : 'mois'}</span>}</p><p className="mt-2 text-sm text-muted-foreground">Périodicité : {sub.amount === null ? '—' : sub.interval === 'year' ? 'Annuelle' : 'Mensuelle'} · Renouvellement : {billingDate(sub.current_period_end)}</p>{sub.complimentary_screens > 0 && <p className="mt-2 text-sm">+ {sub.complimentary_screens} écrans offerts</p>}{scheduled && <p className="mt-2 text-sm">Passage à {scheduled.name} ({scheduled.capacity} écrans) prévu au renouvellement. <button className="underline" onClick={async () => { try { await planDowngrade(null); await refresh(); toast.success('Changement annulé'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Refusé'); } }}>Annuler ce changement</button></p>}{sub.cancel_at_period_end && <p className="mt-2 text-sm text-warning">Annulation à la fin de la période</p>}{sub.status === 'suspended' && <p role="alert" className="mt-3 text-destructive">Nouvelles activations suspendues. Vos données sont conservées.</p>}</div>
      <div><p className="mb-2 text-sm text-muted-foreground">Écrans autorisés</p><p className="text-3xl tabular-nums">{used}<span className="text-xl text-muted-foreground"> / {sub.enforce_capacity ? allowance : 'accès historique'}</span></p><Progress className="mt-5 h-2" value={sub.enforce_capacity && allowance > 0 ? Math.min(100, used / allowance * 100) : 0} aria-label="Capacité utilisée" /><div className="mt-3 flex flex-wrap justify-between gap-2 text-sm text-muted-foreground"><span>{used} écrans utilisés</span><span>{sub.enforce_capacity ? `${availablePlaces(allowance, used)} emplacements disponibles` : 'Limite commerciale non appliquée'}</span></div>{sub.enforce_capacity && used >= allowance && <p className="mt-4 text-sm">Limite atteinte. {next !== null ? `Consultez l’offre ${next} écrans dans les forfaits disponibles pour augmenter votre capacité.` : 'Aucun forfait supérieur n’est actuellement publié. Contactez l’administrateur pour augmenter votre capacité.'} Vos écrans actuels continuent de fonctionner.</p>}<div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" onClick={() => document.getElementById('subscription-plans')?.scrollIntoView({ behavior: 'smooth' })}><ArrowUpRight /> Changer de forfait</Button></div></div>
    </section>
    <section id="subscription-plans" className="py-8"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-medium">Les forfaits Screenflow</h2><Tabs value={interval} onValueChange={setInterval}><TabsList><TabsTrigger value="month">Mensuel</TabsTrigger><TabsTrigger value="year">Annuel{freeMonths !== null && ` · ${freeMonths} mois offerts`}</TabsTrigger></TabsList></Tabs></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{plans.map((plan) => { const isCurrent = plan.id === sub.plan_id && !isTrial; const lower = paid && plan.capacity < sub.capacity; return <Card key={plan.id} className="flex flex-col gap-4 rounded-lg p-5"><div className="flex items-center justify-between gap-2"><h3 className="font-medium">{plan.name}</h3>{isCurrent && <span className="text-xs text-primary">Actuel</span>}</div><p className="text-2xl tabular-nums">{plan.capacity}<span className="ml-1 text-sm text-muted-foreground">écrans</span></p><p className="text-sm">{price(plan)}{plan.monthly_amount !== null && settings.currency && <span className="text-muted-foreground"> / {interval === 'year' ? 'an' : 'mois'}</span>}</p>{isCurrent ? <Button variant="outline" className="mt-auto w-full" disabled>Forfait actuel</Button> : lower ? <Button variant="outline" className="mt-auto w-full" onClick={() => setDowngrade(plan)}><ArrowDownRight /> Passer à ce forfait</Button> : <Button className="mt-auto w-full" disabled title={NO_PROVIDER}>Souscrire</Button>}</Card>; })}</div>
      <p className="mt-4 text-sm text-muted-foreground">La souscription et le passage à un forfait supérieur (immédiat, avec prorata si le prestataire le permet) seront disponibles dès le raccordement du paiement en ligne. Un forfait inférieur s’applique au prochain renouvellement, sans suppression de données.</p></section>
    <section className="border-t py-7"><h2 className="mb-4 text-xl font-medium">Historique des paiements</h2>{data.payments.length ? <ul className="divide-y">{data.payments.map((payment) => <li key={payment.id} className="flex flex-wrap justify-between gap-3 py-4"><span>{billingDate(payment.created_at)} · {payment.kind === 'refund' ? 'Remboursement' : 'Facture'}</span><span>{billingMoney(payment.amount, payment.currency)} · {payment.status}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>}<div className="mt-6 flex flex-wrap gap-3"><Button variant="outline" disabled title={NO_PROVIDER}><Settings /> Mettre à jour mon moyen de paiement</Button><Button variant="outline" disabled title={paid ? NO_PROVIDER : 'Aucun abonnement payant à annuler'}><Ban /> Annuler l’abonnement</Button></div></section>
    <Dialog open={downgrade !== null} onOpenChange={(open) => { if (!open) setDowngrade(null); }}><DialogContent className="max-h-[90svh] overflow-y-auto"><DialogHeader><DialogTitle>Passer à {downgrade?.name}</DialogTitle><DialogDescription>Le changement s’appliquera le {billingDate(sub.current_period_end)}. Vos médias, playlists et configurations sont conservés.</DialogDescription></DialogHeader>{downgrade && <DowngradeForm plan={downgrade} used={used} complimentary={sub.complimentary_screens} onDone={async () => { await refresh(); setDowngrade(null); }} />}</DialogContent></Dialog>
  </div>;
}

function DowngradeForm({ plan, used, complimentary, onDone }: { plan: BillingPlan; used: number; complimentary: number; onDone: () => Promise<void> }) {
  const { screens } = useStore();
  const { data } = useSuspenseQuery(billingQueryOptions);
  const activeIds = new Set(data.entitlements.filter((e) => e.active).map((e) => e.screen_id));
  const active = screens.filter((s) => activeIds.has(s.id));
  const needed = keepSelectionNeeded(used, plan.capacity, complimentary);
  const [keep, setKeep] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  return <div className="space-y-4">{needed > 0 ? <><p className="text-sm">Vous avez {used} écrans actifs. Choisissez les {needed} écrans à conserver ; les autres seront désactivés au renouvellement (jamais supprimés) et pourront être réactivés plus tard.</p><ul className="divide-y rounded-md border">{active.map((s) => <li key={s.id} className="flex items-center gap-3 p-3"><Checkbox id={`keep-${s.id}`} checked={keep.includes(s.id)} disabled={!keep.includes(s.id) && keep.length >= needed} onCheckedChange={(v) => setKeep(v ? [...keep, s.id] : keep.filter((x) => x !== s.id))} /><label htmlFor={`keep-${s.id}`} className="text-sm">{s.name}</label></li>)}</ul><p className="text-sm text-muted-foreground">{keep.length} / {needed} sélectionnés</p></> : <p className="text-sm">Vos {used} écrans actifs tiennent dans ce forfait.</p>}<Button disabled={busy || (needed > 0 && keep.length !== needed)} onClick={async () => { setBusy(true); try { await planDowngrade(plan.id, needed > 0 ? keep : []); await onDone(); toast.success('Changement planifié au renouvellement'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Refusé'); } finally { setBusy(false); } }}>Confirmer le changement</Button></div>;
}
