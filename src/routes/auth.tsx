import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import logoAsset from "@/assets/screenflow-logo.webp.asset.json";
import heroAsset from '@/assets/screenflow-tv-hero.webp.asset.json';
import markAsset from '@/assets/screenflow-mark.webp.asset.json';
import { ArrowRight, Image, Globe, ListVideo, Monitor, Check, Grid2X2, Columns2, CalendarClock, Music, Megaphone, Activity, Users, WifiOff, Plug, Smartphone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { publicPricingSchema, displayMonthly, annualTotal, formatPrice } from "@/lib/public-pricing";

const FEATURES = [
  { icon: Smartphone, title: 'Jumelage simple', detail: 'Code à 6 chiffres ou QR code, groupes d’écrans, rotation d’affichage.' },
  { icon: Image, title: 'Médiathèque', detail: 'Images, vidéos MP4, pages Web et vidéos YouTube en plein écran.' },
  { icon: ListVideo, title: 'Playlists', detail: 'Ordre, durées, 11 transitions entre diapositives, affectation à plusieurs TV ou groupes.' },
  { icon: CalendarClock, title: 'Programmation horaire', detail: 'Une playlist par défaut et des créneaux programmés qui prennent le relais.' },
  { icon: Music, title: 'Musique de fond', detail: 'Une musique par playlist, activable ou non sur chaque écran.' },
  { icon: Megaphone, title: 'Bandeau défilant', detail: 'Texte, couleurs et vitesse réglables, mise à jour possible par API.' },
  { icon: Columns2, title: 'Multi-zones', detail: 'Écran scindé en plusieurs zones avec un contenu dans chacune.' },
  { icon: Grid2X2, title: 'Murs d’images', detail: 'Une même image répartie sur plusieurs TV, avec test de position.' },
  { icon: Plug, title: 'Intégrations', detail: 'Designs Canva publiés, météo locale et publications Instagram.' },
  { icon: Activity, title: 'Supervision', detail: 'État en ligne, contenu en cours et version du player pour chaque TV.' },
  { icon: WifiOff, title: 'Lecture hors ligne', detail: 'Les contenus et la musique continuent même sans Internet.' },
  { icon: Users, title: 'Gestion d’équipe', detail: 'Invitez des collaborateurs et validez leurs modifications.' },
] as const;

const FAQ = [
  ['Comment connecter ma télévision ?', 'Ouvrez Screenflow Player sur votre TV Android, puis associez-la à votre compte avec le code affiché ou son QR code.'],
  ['L’essai gratuit est-il sans engagement ?', 'Oui. L’essai dure 14 jours, jusqu’à 5 écrans, sans carte bancaire.'],
  ['Que se passe-t-il si Internet coupe ?', 'Le player continue de diffuser les contenus déjà téléchargés, musique comprise.'],
  ['Puis-je changer de palier ?', 'Oui. Le passage à un palier supérieur est immédiat ; une baisse s’applique au renouvellement, sans supprimer vos données.'],
  ['Quelles TV sont compatibles ?', 'Android TV et Google TV, ainsi que tout navigateur web. Pour Samsung ou LG, branchez un boîtier Android TV.'],
] as const;
import { ThemeToggle } from '@/components/theme-toggle';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pairingCode, pairingUrl } from "@/lib/qr-pairing";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { pairCode?: string } => {
    const code = pairingCode(search['pairCode']);
    return code ? { pairCode: code } : {};
  },
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { title: "ScreenFlow — Affichage dynamique pour TV Android, tarifs et essai gratuit" },
    { name: "description", content: "Pilotez vos TV Android à distance : playlists, programmation, multi-zones, murs d’images. Essai gratuit 14 jours, tarifs par nombre d’écrans." },
    { property: "og:title", content: "ScreenFlow — Vos contenus sur grand écran" },
    { property: "og:description", content: "Vos contenus, vos écrans, un seul espace ScreenFlow." },
    { property: 'og:image', content: heroAsset.url },
    { name: 'twitter:image', content: heroAsset.url },
  ] }),
  component: AuthPage,
});

function GoogleLogo() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pairCode } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(Boolean(pairCode));
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const { data: pricing } = useQuery({ queryKey: ['public-pricing'], queryFn: async () => {
    const { data, error } = await supabase.rpc('public_pricing');
    if (error) throw error;
    return publicPricingSchema.parse(data);
  }, staleTime: 5 * 60_000 });
  function openAuth(next: 'login' | 'signup') { setMode(next); setConnecting(true); }
  function choosePlan(planId: string) {
    try { sessionStorage.setItem('screenflow:chosen-plan', planId); } catch { /* optional */ }
    openAuth('signup');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Lien envoyé — vérifiez votre e-mail pour réinitialiser votre mot de passe.");
        setMode("login");
      } else if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Cache priming is optional: a successful login must still navigate if it fails.
        // Keep this inline so a stale helper module cannot interrupt sign-in.
        if (data.user) {
          try {
            await queryClient.cancelQueries({ queryKey: ['auth', 'verified-user'] });
            queryClient.setQueryData(['auth', 'verified-user'], data.user);
          } catch {
            // The protected route will verify the identity if the cache is unavailable.
          }
        }
        if (pairCode) await navigate({ to: "/pair", search: { code: pairCode } });
        else {
          let chosen: string | null = null;
          try { chosen = sessionStorage.getItem('screenflow:chosen-plan'); sessionStorage.removeItem('screenflow:chosen-plan'); } catch { /* optional */ }
          await navigate({ to: chosen ? "/subscription" : "/" });
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: pairCode ? pairingUrl(window.location.origin, pairCode) : window.location.origin, data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        toast.success("Compte créé — vérifiez votre e-mail pour confirmer l'inscription.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: pairCode ? pairingUrl(window.location.origin, pairCode) : window.location.origin });
    if (result.error) toast.error("La connexion a échoué, réessayez.");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="welcome-header">
        <img src={logoAsset.url} alt="Screenflow" className="welcome-logo h-10 w-auto max-w-32 shrink-0 object-contain" />
        <nav aria-label="Navigation de l’accueil" className="welcome-nav">
          <Button variant="ghost" asChild><a href="#fonctionnalites">Fonctionnalités</a></Button>
          <Button variant="ghost" asChild><a href="#tarifs">Tarifs</a></Button>
          <Button variant="ghost" asChild><a href="#questions">Questions fréquentes</a></Button>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button className="shrink-0 rounded-full px-5" onClick={() => openAuth('login')}>Se connecter</Button>
        </div>
      </header>
      <main>
        <section id="screenflow" className="google-tv-welcome">
          <img src={heroAsset.url} alt="Télévision Screenflow présentant des paysages, de l’architecture et des images colorées" className="google-tv-welcome-image" fetchPriority="high" />
          <div className="google-tv-welcome-copy">
            <h1 className="google-tv-welcome-title"><img src={markAsset.url} alt="" />Screenflow</h1>
            <p className="google-tv-welcome-tagline">L’affichage dynamique pilotable à distance<br />pour toutes vos TV Android.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" className="rounded-full px-7" onClick={() => openAuth('signup')}>Essai gratuit {pricing?.trial_days ?? 14} jours <ArrowRight /></Button>
              <Button size="lg" variant="outline" className="rounded-full px-7" asChild><a href="#tarifs">Voir les tarifs</a></Button>
            </div>
          </div>
        </section>
        <section className="bg-background px-6 py-16 sm:px-12">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-medium">Opérationnel en 3 étapes</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {[['1', 'Installez le player', 'Installez Screenflow Player sur votre TV Android, Google TV ou ouvrez-le dans un navigateur.'], ['2', 'Jumelez l’écran', 'Saisissez le code affiché sur la TV ou scannez son QR code depuis votre espace.'], ['3', 'Diffusez', 'Créez vos playlists et affectez-les à vos TV ou groupes : la mise à jour arrive en quelques secondes.']].map(([n, t, d]) => <li key={n} className="rounded-2xl border bg-card p-6"><span className="flex size-10 items-center justify-center rounded-full bg-accent font-medium text-accent-foreground">{n}</span><h3 className="mt-4 text-lg font-medium">{t}</h3><p className="mt-2 text-sm text-muted-foreground">{d}</p></li>)}
            </ol>
          </div>
        </section>
        <section id="fonctionnalites" className="bg-muted px-6 py-16 sm:px-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-medium">Tout pour gérer votre réseau d’écrans</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, detail }) => <div key={title} className="rounded-2xl bg-card p-6"><Icon className="mb-4 size-7 text-primary" strokeWidth={1.5} /><h3 className="font-medium">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</p></div>)}
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground">Compatible Android TV, Google TV et navigateur web. Les TV Samsung (Tizen) et LG (webOS) ne sont pas prises en charge : utilisez un boîtier Android TV en HDMI.</p>
          </div>
        </section>
        <section id="tarifs" className="bg-background px-6 py-16 sm:px-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-medium">Des tarifs simples, selon votre nombre d’écrans</h2>
            <p className="mt-3 text-center text-muted-foreground">Essai gratuit de {pricing?.trial_days ?? 14} jours jusqu’à {pricing?.trial_capacity ?? 5} écrans, sans carte bancaire.</p>
            <div className="mt-8 flex justify-center">
              <div role="group" aria-label="Période de facturation" className="inline-flex rounded-full border p-1">
                {(['monthly', 'annual'] as const).map((c) => <Button key={c} size="sm" variant={cycle === c ? 'default' : 'ghost'} className="rounded-full" onClick={() => setCycle(c)}>{c === 'monthly' ? 'Mensuel' : 'Annuel — 2 mois offerts'}</Button>)}
              </div>
            </div>
            {!pricing ? <p className="mt-10 text-center text-muted-foreground">Chargement des tarifs…</p> : (
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {pricing.plans.map((plan, i) => {
                  const discount = pricing.annual_discount_percent ?? 0;
                  const currency = pricing.currency ?? 'MAD';
                  return (
                    <div key={plan.id} className={`flex flex-col rounded-2xl border p-6 ${i === 1 ? 'border-primary bg-accent/40' : 'bg-card'}`}>
                      {i === 1 && <span className="mb-2 w-fit rounded-full bg-primary px-3 py-0.5 text-xs text-primary-foreground">Le plus choisi</span>}
                      <h3 className="text-lg font-medium">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">Jusqu’à {plan.capacity} écrans</p>
                      <p className="mt-5 text-3xl font-medium tabular-nums">{formatPrice(displayMonthly(plan.monthly_amount, cycle, discount), currency)}<span className="text-sm font-normal text-muted-foreground"> /mois</span></p>
                      <p className="mt-1 h-5 text-xs text-muted-foreground">{cycle === 'annual' ? `Soit ${formatPrice(annualTotal(plan.monthly_amount, discount), currency)} par an` : ''}</p>
                      <ul className="mt-5 flex-1 space-y-2 text-sm">
                        {['Toutes les fonctionnalités', 'Lecture hors ligne', 'Équipe et programmation'].map((f) => <li key={f} className="flex gap-2"><Check className="size-4 shrink-0 text-primary" />{f}</li>)}
                      </ul>
                      <Button className="mt-6 w-full rounded-full" variant={i === 1 ? 'default' : 'outline'} onClick={() => choosePlan(plan.id)}>Commencer l’essai</Button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-6 text-center text-xs text-muted-foreground">Prix hors taxes. L’abonnement se choisit depuis votre espace à la fin de l’essai.</p>
          </div>
        </section>
        <section id="questions" className="bg-muted px-6 py-16 sm:px-12">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-center text-3xl font-medium">Questions fréquentes</h2>
            {FAQ.map(([question, answer]) => <details className="welcome-faq border-b py-5" key={question}><summary className="cursor-pointer text-lg font-medium">{question}</summary><p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{answer}</p></details>)}
          </div>
        </section>
        <section className="bg-background px-6 py-16 text-center sm:px-12">
          <h2 className="text-3xl font-medium">Prêt à allumer vos écrans ?</h2>
          <Button size="lg" className="mt-6 rounded-full px-7" onClick={() => openAuth('signup')}>Créer mon compte gratuit <ArrowRight /></Button>
        </section>
      </main>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t px-6 py-7 sm:px-12"><img src={logoAsset.url} alt="Screenflow" className="welcome-logo h-8 w-auto max-w-28 object-contain" /><span className="text-sm text-muted-foreground">Vos contenus. Tous vos écrans.</span></footer>
      <Dialog open={connecting} onOpenChange={setConnecting}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
      <div className="w-full">
        <div className="mb-8 text-center">
          <DialogHeader>
          <DialogTitle className="text-center text-2xl font-normal">{mode === "login" ? "Connexion" : mode === "signup" ? "Créer un compte" : "Mot de passe oublié"}</DialogTitle>
          <DialogDescription className="mt-3 text-center">
            {mode === "login" ? "Connectez-vous pour gérer vos écrans." : mode === "signup" ? "Créez votre compte ScreenFlow." : "Saisissez votre e-mail pour recevoir un lien de réinitialisation."}
          </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-5">
          {mode !== "forgot" && <>
            <div className="grid gap-2">
              <Button type="button" variant="outline" onClick={() => void oauth("google")}>
                <GoogleLogo /> Continuer avec Google
              </Button>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>
          </>}
          <form onSubmit={submit} className="space-y-5 [&_input]:h-12 [&_input]:bg-background [&_input]:shadow-none">
            {mode === "signup" && <div className="space-y-2"><Label htmlFor="full-name">Nom complet</Label><Input id="full-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.com" />
            </div>
            {mode !== "forgot" && <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                {mode === "login" && <Button variant="link" type="button" className="h-auto px-0 text-xs" onClick={() => setMode("forgot")}>Mot de passe oublié ?</Button>}
              </div>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 caractères minimum" />
            </div>}
            <Button className="w-full" size="lg" disabled={busy}>
              {mode === "login" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "forgot" ? (
              <Button variant="link" type="button" className="px-0" onClick={() => setMode("login")}>Retour à la connexion</Button>
            ) : (
              <>
                {mode === "login" ? "Pas encore de compte ?" : "Déjà inscrit ?"}{" "}
                <Button variant="link" type="button" className="px-0" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
                  {mode === "login" ? "Créer un compte" : "Se connecter"}
                </Button>
              </>
            )}
          </p>
        </div>
      </div>
      </DialogContent>
      </Dialog>
    </div>
  );
}
