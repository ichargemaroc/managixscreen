import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Monitor, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pairingCode } from "@/lib/qr-pairing";
import { addScreen } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/pair")({
  validateSearch: (search: Record<string, unknown>): { code?: string } => {
    const code = pairingCode(search['code']);
    return code ? { code } : {};
  },
  head: () => ({ meta: [
    { title: "Appairage par QR code — ScreenFlow" },
    { name: "description", content: "Associez le lecteur TV à votre compte ScreenFlow." },
    { property: "og:title", content: "Appairage par QR code — ScreenFlow" },
    { property: "og:description", content: "Confirmez l’association de votre téléviseur." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: PairPage,
});

function PairPage() {
  const { code } = Route.useSearch();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => { if (active) setSignedIn(!!data.user); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session?.user));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <div className="w-full max-w-md space-y-6">
      {done ? <CheckCircle2 className="size-12 text-success" /> : <Monitor className="size-12 text-primary" />}
      <h1 className="text-2xl">{done ? "TV jumelée" : "Jumeler cet écran"}</h1>
      {done ? <><p>{name} est associé à votre compte.</p><Button asChild><Link to="/screens">Voir mes écrans</Link></Button></> : !code ? <><p role="alert">Ce QR code est invalide. Demandez un nouveau code sur le lecteur TV.</p><Button asChild variant="outline"><Link to="/screens">Mes écrans</Link></Button></> : <>
        <p className="text-muted-foreground">Code de jumelage <strong className="text-foreground">{code}</strong></p>
        {signedIn === null ? <p role="status">Chargement…</p> : !signedIn ? <Button asChild><Link to="/auth" search={{ pairCode: code }}>Se connecter pour jumeler</Link></Button> : <form className="space-y-4" onSubmit={async (event) => {
          event.preventDefault(); if (busy) return; setBusy(true); setError("");
          try { await addScreen(name.trim(), code, null, location.trim()); setDone(true); }
          catch (err) { setError(err instanceof Error ? err.message : "Le jumelage a échoué."); }
          finally { setBusy(false); }
        }}>
          <div className="space-y-2"><Label htmlFor="pair-name">Nom de la TV</Label><Input id="pair-name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Accueil" /></div>
          <div className="space-y-2"><Label htmlFor="pair-location">Lieu (facultatif)</Label><Input id="pair-location" maxLength={240} value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy || !name.trim()} className="w-full">{busy ? "Vérification…" : "Jumeler"}</Button>
        </form>}
      </>}
    </div>
  </main>;
}