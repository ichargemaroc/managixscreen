import { webpageUrl } from '@/lib/webpage';

export function WebpagePreview({ url, name }: { url: string; name: string }) {
  let safe: string;
  try { safe = webpageUrl(url); } catch { return <p role="alert">URL non valide.</p>; }
  return <div className="space-y-3"><iframe title={name} src={safe} sandbox="allow-scripts allow-forms" referrerPolicy="no-referrer" className="h-96 w-full border bg-background" /><p className="text-sm text-muted-foreground">Certains sites refusent l’aperçu intégré ; leur affichage sur la TV doit être vérifié séparément.</p><a className="text-sm text-primary underline" href={safe} target="_blank" rel="noopener noreferrer">Ouvrir le site dans un nouvel onglet</a></div>;
}