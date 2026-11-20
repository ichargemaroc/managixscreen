import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Settings — ScreenFlow" },
    { name: "description", content: "Profil, utilisateurs et configuration du compte." },
    { property: "og:title", content: "Settings — ScreenFlow" },
    { property: "og:description", content: "Profil, utilisateurs et configuration du compte." },
  ] }),
  component: SettingsPage,
});

const soon = "Disponible après l'activation des comptes utilisateurs.";

function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Profil, équipe et compte." />
      <Tabs defaultValue="profile">
        <TabsList><TabsTrigger value="profile">Profil</TabsTrigger><TabsTrigger value="users">Utilisateurs</TabsTrigger><TabsTrigger value="account">Compte</TabsTrigger></TabsList>
        <TabsContent value="profile"><Card><CardHeader><CardTitle>Profil</CardTitle><CardDescription>{soon}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Nom complet</Label><Input disabled /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" disabled /></div>
            <Button disabled>Enregistrer</Button>
          </CardContent></Card></TabsContent>
        <TabsContent value="users"><Card><CardHeader><CardTitle>Utilisateurs</CardTitle><CardDescription>Invitez des membres et définissez leurs rôles. {soon}</CardDescription></CardHeader>
          <CardContent className="flex gap-2"><Input placeholder="email@entreprise.com" disabled /><Button disabled>Inviter</Button></CardContent></Card></TabsContent>
        <TabsContent value="account"><Card><CardHeader><CardTitle>Compte</CardTitle><CardDescription>Nom de l'organisation et fuseau horaire. {soon}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Organisation</Label><Input disabled /></div>
            <div className="space-y-2"><Label>Fuseau horaire</Label><Input value={Intl.DateTimeFormat().resolvedOptions().timeZone} disabled readOnly /></div>
          </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
