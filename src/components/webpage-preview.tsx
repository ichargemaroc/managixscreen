import { displayWebpageUrl, youtubeEmbedUrl } from '@/lib/webpage';
import { isScreenflowDisplay,previewDisplayUrl } from '@/lib/integrations';

export function WebpagePreview({ url, name }: { url: string; name: string }) {
  let safe: string;let trusted=false;
  try { const origin=typeof window!=='undefined'?window.location.origin:'https://screenflow.live';trusted=isScreenflowDisplay(url,origin);safe=trusted?previewDisplayUrl(url,origin):displayWebpageUrl(url); } catch { return <p role="alert">URL non valide.</p>; }
  const youtube = !!youtubeEmbedUrl(url);
  return <div className="space-y-3"><iframe title={name} src={safe} sandbox={trusted?'allow-scripts allow-same-origin':youtube ? 'allow-scripts allow-same-origin allow-presentation' : typeof window!=='undefined'&&new URL(safe,window.location.href).origin!==window.location.origin ? 'allow-scripts allow-same-origin allow-forms' : 'allow-scripts allow-forms'} allow={youtube ? 'autoplay; encrypted-media; picture-in-picture' : undefined} referrerPolicy="no-referrer" className="h-96 w-full border bg-background" />{!trusted&&<p className="text-sm text-muted-foreground">Certains sites refusent l’aperçu intégré ; leur affichage sur la TV doit être vérifié séparément.</p>}<a className="text-sm text-primary underline" href={safe} target="_blank" rel="noopener noreferrer">Ouvrir le site dans un nouvel onglet</a></div>;
}