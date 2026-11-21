import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import logoAsset from "@/assets/screenflow-logo.png.asset.json";
import heroAsset from '@/assets/screenflow-tv-hero.png.asset.json';
import markAsset from '@/assets/screenflow-mark.png.asset.json';
import { ArrowRight, Image, Globe, ListVideo, Monitor } from "lucide-react";
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
    { title: "ScreenFlow — Vos contenus sur grand écran" },
    { name: "description", content: "Vos photos, vidéos et pages Web réunies sur vos TV Android avec ScreenFlow." },
    { property: "og:title", content: "ScreenFlow — Vos contenus sur grand écran" },
    { property: "og:description", content: "Vos contenus, vos écrans, un seul espace ScreenFlow." },
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
  const { pairCode } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(Boolean(pairCode));

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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (pairCode) await navigate({ to: "/pair", search: { code: pairCode } });
        else await navigate({ to: "/" });
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
          <Button variant="ghost" asChild><a href="#screenflow">Découvrir Screenflow</a></Button>
          <Button variant="ghost" asChild><a href="#contenus">Vos contenus</a></Button>
          <Button variant="ghost" asChild><a href="#questions">Questions fréquentes</a></Button>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button className="shrink-0 rounded-full px-5" onClick={() => { setMode('login'); setConnecting(true); }}>Se connecter</Button>
        </div>
      </header>
      <main>
        <section id="screenflow" className="google-tv-welcome">
          <img src={heroAsset.url} alt="Télévision Screenflow présentant des paysages, de l’architecture et des images colorées" className="google-tv-welcome-image" fetchPriority="high" />
          <div className="google-tv-welcome-copy">
            <h1 className="google-tv-welcome-title"><img src={markAsset.url} alt="" />Screenflow</h1>
            <p className="google-tv-welcome-tagline">Tous vos contenus.<br />Un seul espace pour vos écrans.</p>
            <Button size="lg" className="mt-6 rounded-full px-7" onClick={() => { setMode("signup"); setConnecting(true); }}>Commencer avec Screenflow <ArrowRight /></Button>
          </div>
        </section>
        <section id="contenus" className="welcome-content-band bg-background px-6 sm:px-12">
          <div className="mx-auto max-w-5xl text-center">
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">Vos images, vos vidéos et vos pages Web réunies sur vos TV Android. De l’écran d’accueil au mur d’images, donnez à chaque lieu le contenu qui lui ressemble.</p>
            <h2 className="mt-14 text-4xl font-medium">À chaque écran, son contenu.</h2>
            <div className="welcome-content-grid">
              {[{ icon: Image, title: 'Photos & vidéos', detail: 'Vos médias sur grand écran.' }, { icon: Globe, title: 'Pages Web', detail: 'Vos sites et contenus en ligne.' }, { icon: ListVideo, title: 'Playlists', detail: 'Vos contenus, dans le bon ordre.' }, { icon: Monitor, title: 'Murs d’écrans', detail: 'Une image, plusieurs écrans.' }].map(({ icon: Icon, title, detail }) => <div key={title}><Icon className="mx-auto mb-5 size-8 text-primary" strokeWidth={1.5} /><h3 className="text-lg font-medium">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{detail}</p></div>)}
            </div>
          </div>
        </section>
        <section id="questions" className="bg-muted px-6 py-16 sm:px-12">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-center text-3xl font-medium">Questions fréquentes</h2>
            {[['Comment connecter ma télévision ?', 'Ouvrez Screenflow Player sur votre télévision Android, puis associez-la à votre compte avec le code affiché ou son QR code.'], ['Quels contenus puis-je diffuser ?', 'Ajoutez vos photos, vidéos ou pages Web dans Médias, puis réunissez-les dans une playlist à affecter à vos écrans. Certains sites limitent leur affichage intégré.'], ['Puis-je gérer plusieurs écrans ?', 'Oui. Retrouvez vos télévisions dans le même espace, organisez-les en groupes et affectez vos playlists ou vos murs d’images.']].map(([question, answer]) => <details className="welcome-faq border-b py-5" key={question}><summary className="cursor-pointer text-lg font-medium">{question}</summary><p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{answer}</p></details>)}
          </div>
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
