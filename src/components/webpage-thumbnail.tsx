import { useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';
import { webpageThumbnailConfig } from '@/lib/webpage-thumbnail';

export function WebpageThumbnail({ url, name }: { url: string; name: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [origin, setOrigin] = useState('https://screenflow.live');
  useEffect(() => {
    setOrigin(window.location.origin);
    const element = container.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  let config: ReturnType<typeof webpageThumbnailConfig> | null = null;
  try { config = webpageThumbnailConfig(url, origin); } catch { /* Keep the safe placeholder. */ }
  return <div ref={container} className="relative flex size-full items-center justify-center overflow-hidden bg-muted text-muted-foreground" title="Certains sites refusent les aperçus intégrés.">
    <Globe className="size-10" />
    {visible && config && !failed && <iframe
      key={config.src} src={config.src} title={`Vignette de ${name}`} tabIndex={-1} aria-hidden="true"
      sandbox={config.sandbox} allow="autoplay 'none'; camera 'none'; microphone 'none'; geolocation 'none'"
      referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)}
      className="webpage-library-thumbnail" />}
    <span className="pointer-events-none absolute bottom-2 left-2 right-2 flex min-w-0 items-center gap-1 rounded bg-background/90 px-2 py-1 text-xs text-foreground"><Globe className="size-3 shrink-0" /><span className="truncate">{config?.hostname ?? 'Aperçu indisponible'}</span></span>
  </div>;
}