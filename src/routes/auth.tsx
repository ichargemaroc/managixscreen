import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import logoAsset from "@/assets/screenflow-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
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
    { title: "Connexion — ScreenFlow" },
    { name: "description", content: "Connectez-vous à ScreenFlow pour gérer vos écrans." },
    { property: "og:title", content: "Connexion — ScreenFlow" },
    { property: "og:description", content: "Connectez-vous à ScreenFlow pour gérer vos écrans." },
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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
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

  async function oauth(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: pairCode ? pairingUrl(window.location.origin, pairCode) : window.location.origin });
    if (result.error) toast.error("La connexion a échoué, réessayez.");
  }

  return (
    <div className="flex min-h-screen flex-col bg-sidebar">
      <header className="flex h-20 shrink-0 items-center px-6 sm:px-10">
        <img src={logoAsset.url} alt="Screenflow" className="h-10 w-auto max-w-full object-contain" />
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-normal">{mode === "login" ? "Connexion" : "Créer un compte"}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "login" ? "Connectez-vous pour gérer vos écrans." : "Créez votre compte ScreenFlow."}
          </p>
        </div>
        <div className="space-y-5">
          <div className="grid gap-2">
            <Button type="button" variant="outline" onClick={() => void oauth("google")}>
              <GoogleLogo /> Continuer avec Google
            </Button>
            <Button type="button" variant="outline" onClick={() => void oauth("lovable")}>
              <LovableMark /> Continuer avec Lovable
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submit} className="space-y-5 [&_input]:h-12 [&_input]:bg-background [&_input]:shadow-none">
            {mode === "signup" && <div className="space-y-2"><Label htmlFor="full-name">Nom complet</Label><Input id="full-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@entreprise.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 caractères minimum" />
            </div>
            <Button className="w-full" size="lg" disabled={busy}>
              {mode === "login" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? "Pas encore de compte ?" : "Déjà inscrit ?"}{" "}
            <Button variant="link" type="button" className="px-0" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "Créer un compte" : "Se connecter"}
            </Button>
          </p>
        </div>
      </div>
      </main>
    </div>
  );
}
