import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import logoAsset from "@/assets/screenflow-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { title: "Nouveau mot de passe — ScreenFlow" },
    { name: "description", content: "Choisissez un nouveau mot de passe pour votre compte ScreenFlow." },
    { property: "og:title", content: "Nouveau mot de passe — ScreenFlow" },
    { property: "og:description", content: "Choisissez un nouveau mot de passe pour votre compte ScreenFlow." },
  ] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setState("ready");
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setState("ready");
    });
    const timer = window.setTimeout(() => {
      setState((s) => (s === "checking" ? "invalid" : s));
    }, 6000);
    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Mot de passe mis à jour — vous êtes connecté.");
      await navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-20 shrink-0 items-center bg-sidebar px-6 sm:px-10">
        <img src={logoAsset.url} alt="Screenflow" className="h-10 w-auto max-w-full object-contain" />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {state === "checking" && (
            <p className="text-center text-muted-foreground">Vérification du lien…</p>
          )}
          {state === "invalid" && (
            <div className="space-y-6 text-center">
              <h1 className="text-2xl font-normal">Lien invalide ou expiré</h1>
              <p className="text-muted-foreground">Demandez un nouveau lien de réinitialisation depuis la page de connexion.</p>
              <Button asChild size="lg"><Link to="/auth">Retour à la connexion</Link></Button>
            </div>
          )}
          {state === "ready" && (
            <div className="space-y-8">
              <div className="space-y-3 text-center">
                <h1 className="text-2xl font-normal">Nouveau mot de passe</h1>
                <p className="text-muted-foreground">Choisissez un nouveau mot de passe pour votre compte.</p>
              </div>
              <form onSubmit={submit} className="space-y-5 [&_input]:h-12 [&_input]:bg-background [&_input]:shadow-none">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <Input id="new-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 caractères minimum" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                  <Input id="confirm-password" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Retapez le mot de passe" />
                </div>
                <Button className="w-full" size="lg" disabled={busy}>Mettre à jour le mot de passe</Button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
