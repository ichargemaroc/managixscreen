import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [
    { title: "Paramètres — ScreenFlow" },
    { name: "description", content: "Profil, utilisateurs et configuration du compte." },
    { property: "og:title", content: "Paramètres — ScreenFlow" },
    { property: "og:description", content: "Profil, utilisateurs et configuration du compte." },
  ] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [org, setOrg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data } = await supabase.from("profiles").select("full_name, org_name").eq("id", user.id).maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setOrg(data.org_name ?? "");
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("profiles").update({ full_name: fullName, org_name: org }).eq("id", user.id);
      if (error) throw error;
      toast.success("Profil enregistré");
    } catch {
      toast.error("L'enregistrement a échoué");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Paramètres" description="Profil, équipe et compte." />
      <Tabs defaultValue="profile">
        <TabsList><TabsTrigger value="profile">Profil</TabsTrigger><TabsTrigger value="users">Utilisateurs</TabsTrigger><TabsTrigger value="account">Compte</TabsTrigger></TabsList>
        <TabsContent value="profile"><Card><CardHeader><CardTitle>Profil</CardTitle><CardDescription>Vos informations personnelles.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Nom complet</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Votre nom" /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={email} disabled /></div>
            <Button onClick={() => void save()} disabled={saving}>Enregistrer</Button>
          </CardContent></Card></TabsContent>
        <TabsContent value="users"><Card><CardHeader><CardTitle>Utilisateurs</CardTitle><CardDescription>L'invitation de membres d'équipe arrive dans une prochaine version.</CardDescription></CardHeader>
          <CardContent className="flex gap-2"><Input placeholder="email@entreprise.com" disabled /><Button disabled>Inviter</Button></CardContent></Card></TabsContent>
        <TabsContent value="account"><Card><CardHeader><CardTitle>Compte</CardTitle><CardDescription>Nom de l'organisation et fuseau horaire.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Organisation</Label><Input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Nom de votre entreprise" /></div>
            <div className="space-y-2"><Label>Fuseau horaire</Label><Input value={Intl.DateTimeFormat().resolvedOptions().timeZone} disabled readOnly /></div>
            <Button onClick={() => void save()} disabled={saving}>Enregistrer</Button>
            <div className="border-t pt-4">
              <Button variant="outline" className="text-destructive" onClick={() => void signOut()}><LogOut /> Se déconnecter</Button>
            </div>
          </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
