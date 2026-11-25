import { useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TICKER_API_ENDPOINT, TICKER_API_EXAMPLES, TICKER_API_RESPONSES } from '@/lib/ticker-api-docs';

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return <div className="min-w-0 overflow-hidden rounded-md border bg-muted/40">
    <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Button variant="ghost" size="sm" aria-label={`Copier ${label}`} onClick={async () => {
        try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }
        catch { toast.error('Copie impossible. Sélectionnez le texte de l’exemple.'); }
      }}><Copy className="size-3.5" />{copied ? 'Copié' : 'Copier'}</Button>
    </div>
    <pre className="overflow-x-auto p-4 text-xs leading-6"><code>{code}</code></pre>
  </div>;
}

export function TickerApiDocumentation() {
  return <article className="min-w-0 space-y-8 pb-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-2xl font-semibold">API ScreenFlow</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Envoyez le texte du bandeau d’une playlist depuis votre application. Cette API ne permet pas de gérer les comptes, médias ou téléviseurs.</p></div>
      <Button variant="outline" asChild><a href="/downloads/DOCUMENTATION_API_BANDEAU.md" download="DOCUMENTATION_API_BANDEAU.md"><Download className="size-4" />Télécharger le guide</a></Button>
    </header>
    <section className="space-y-3"><h3 className="font-semibold">Adresse de l’API</h3><CodeBlock label="Adresse et méthode" code={`POST ${TICKER_API_ENDPOINT}`} /><p className="text-sm text-muted-foreground">Utilisez la version publiée contenant cette API. Une réponse 404 peut indiquer une adresse incorrecte ou une publication à mettre à jour.</p></section>
    <section className="space-y-3"><h3 className="font-semibold">Clé API et authentification</h3>
      <ol className="list-decimal space-y-2 pl-5 text-sm"><li>Ouvrez votre playlist dans <strong>Playlists → Paramètres → Bandeau défilant → Mise à jour par API</strong>.</li><li>Cliquez sur <strong>Générer une clé API</strong> et copiez-la immédiatement : elle n’est affichée qu’à sa création.</li><li>Envoyez cette clé dans l’en-tête <code>Authorization</code>, précédée de <code>Bearer</code> et d’un espace.</li></ol>
      <CodeBlock label="En-têtes HTTP" code={'Authorization: Bearer VOTRE_CLE_API\nContent-Type: application/json'} />
      <p className="text-sm text-muted-foreground">Chaque clé de 64 caractères hexadécimaux cible une seule playlist : aucun identifiant de playlist ou de TV n’est nécessaire. Conservez-la côté serveur, jamais dans une URL ou une page publique. Régénérer invalide l’ancienne clé ; Désactiver la révoque.</p>
    </section>
    <section className="space-y-3"><h3 className="font-semibold">Données à envoyer</h3>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="p-3">Champ</th><th className="p-3">Type</th><th className="p-3">Règle</th></tr></thead><tbody><tr className="border-b"><td className="p-3 font-mono">text</td><td className="p-3">Chaîne</td><td className="p-3">Obligatoire, maximum 500 caractères.</td></tr><tr className="border-b"><td className="p-3 font-mono">enabled</td><td className="p-3">Booléen</td><td className="p-3">Facultatif : true active, false masque ; omis, conserve l’état actuel.</td></tr></tbody></table></div>
      <CodeBlock label="Corps JSON" code={'{\n  "text": "Bienvenue • Promotion du jour -20 %",\n  "enabled": true\n}'} />
      <p className="text-sm text-muted-foreground">Les champs supplémentaires sont refusés. Un texte vide ou composé d’espaces ne s’affiche pas. Pour masquer le bandeau, envoyez aussi le champ text.</p>
    </section>
    <section className="min-w-0 space-y-3"><h3 className="font-semibold">Exemples d’intégration</h3><p className="text-sm text-muted-foreground">Définissez SCREENFLOW_API_KEY dans les secrets de votre application. Les exemples JavaScript s’exécutent côté serveur.</p>
      <Tabs defaultValue="cURL"><div className="overflow-x-auto"><TabsList aria-label="Langage de l’exemple">{Object.keys(TICKER_API_EXAMPLES).map(name => <TabsTrigger key={name} value={name}>{name === 'JavaScript' ? 'JavaScript / Node.js' : name}</TabsTrigger>)}</TabsList></div>{Object.entries(TICKER_API_EXAMPLES).map(([name, code]) => <TabsContent key={name} value={name}><CodeBlock label={`Exemple ${name}`} code={code} /></TabsContent>)}</Tabs>
    </section>
    <section className="space-y-3"><h3 className="font-semibold">Réponses HTTP</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="p-3">Code</th><th className="p-3">Signification</th></tr></thead><tbody>{TICKER_API_RESPONSES.map(([code, meaning]) => <tr key={code} className="border-b"><td className="p-3 align-top font-mono">{code}</td><td className="p-3">{meaning}</td></tr>)}</tbody></table></div></section>
    <section className="space-y-3 border-t pt-6"><h3 className="font-semibold">Affichage sur les téléviseurs</h3><p className="text-sm text-muted-foreground">L’apparence du bandeau reste inchangée : hauteur, couleurs, opacité, taille du texte, mode et durée de défilement.</p><p className="text-sm text-muted-foreground">Un rafraîchissement est demandé après enregistrement. Le délai dépend de la connexion, de la playlist active et de la version du player : une réponse 200 ne confirme pas l’affichage immédiat. Un ancien APK sans bandeau doit être mis à jour. Hors connexion, la TV conserve le dernier contenu synchronisé jusqu’à la reconnexion.</p></section>
  </article>;
}