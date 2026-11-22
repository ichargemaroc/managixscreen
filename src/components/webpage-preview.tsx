import { displayWebpageUrl, youtubeEmbedUrl } from '@/lib/webpage';

export function WebpagePreview({ url, name }: { url: string; name: string }) {
  let safe: string;
  try { const candidate=new URL(url);const ownDisplay=typeof window!=='undefined'&&candidate.origin===window.location.origin&&/^\/display\/(weather|instagram)$/.test(candidate.pathname);safe = ownDisplay ? candidate.href : displayWebpageUrl(url); } catch { return <p role="alert">URL non valide.</p>; }
  const youtube = !!youtubeEmbedUrl(url);
  return <div className="space-y-3"><iframe title={name} src={safe} sandbox={youtube ? 'allow-scripts allow-same-origin allow-presentation' : 'allow-scripts allow-forms'} allow={youtube ? 'autoplay; encrypted-media; picture-in-picture' : undefined} referrerPolicy="no-referrer" className="h-96 w-full border bg-background" /><p className="text-sm text-muted-foreground">Certains sites refusent l’aperçu intégré ; leur affichage sur la TV doit être vérifié séparément.</p><a className="text-sm text-primary underline" href={safe} target="_blank" rel="noopener noreferrer">Ouvrir le site dans un nouvel onglet</a></div>;
}