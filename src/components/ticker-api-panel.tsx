import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { rotateTickerKey, revokeTickerKey, tickerKeyStatus } from '@/lib/ticker-api.functions';

export function TickerApiPanel({ playlistId }: { playlistId: string }) {
  const [status, setStatus] = useState<{ created_at: string; last_used_at: string | null } | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const endpoint = typeof window === 'undefined' ? '/api/public/ticker' : `${window.location.origin}/api/public/ticker`;
  const load = () => tickerKeyStatus({ data: { playlistId } }).then(setStatus).catch(() => {});
  useEffect(() => { void load(); }, [playlistId]);
  const copy = (v: string) => void navigator.clipboard.writeText(v).then(() => toast.success('Copié'));
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); await load(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec'); } finally { setBusy(false); } };
  const example = `curl -X POST ${endpoint} \\\n  -H "Authorization: Bearer ${key || '<votre clé>'}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"text":"Promo du jour -20 %","enabled":true}'`;
  return <section className="grid gap-3 border-t pt-4">
    <div><h3 className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4" />Mise à jour par API</h3><p className="text-sm text-muted-foreground">Une autre application peut envoyer le texte du bandeau. L’apparence reste celle réglée ici.</p></div>
    <p className="text-sm">{status ? `Clé active depuis le ${new Date(status.created_at).toLocaleDateString('fr-FR')}${status.last_used_at ? ` · dernier envoi ${new Date(status.last_used_at).toLocaleString('fr-FR')}` : ' · jamais utilisée'}` : 'Aucune clé active.'}</p>
    {key && <div className="grid gap-1 rounded-md border bg-muted/50 p-3"><p className="text-xs font-medium">Copiez cette clé maintenant : elle ne sera plus affichée.</p><div className="flex items-center gap-2"><code className="flex-1 break-all text-xs">{key}</code><Button size="icon" variant="ghost" aria-label="Copier la clé" onClick={() => copy(key)}><Copy className="size-4" /></Button></div></div>}
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy} onClick={() => void run(async () => { if (status && !confirm('L’ancienne clé cessera de fonctionner. Continuer ?')) return; setKey(await rotateTickerKey({ data: { playlistId } })); })}>{status ? 'Régénérer la clé' : 'Générer une clé API'}</Button>
      {status && <Button variant="ghost" disabled={busy} onClick={() => void run(async () => { await revokeTickerKey({ data: { playlistId } }); setKey(''); toast.success('Clé désactivée'); })}>Désactiver</Button>}
    </div>
    <div className="grid gap-1"><div className="flex items-center justify-between"><span className="text-xs font-medium">Exemple d’appel</span><Button size="sm" variant="ghost" onClick={() => copy(example)}><Copy className="size-3.5" />Copier</Button></div><pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{example}</pre></div>
  </section>;
}
