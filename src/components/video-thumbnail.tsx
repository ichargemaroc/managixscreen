import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Film, Play } from 'lucide-react';
import type { Media } from '@/lib/store';
import { formatDuration } from '@/lib/store';
import { captureVideoThumbnail } from '@/lib/video-thumbnail';

export function VideoThumbnail({ media }: { media: Media }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const { data: image } = useQuery({
    queryKey: ['media-private-links', 'video-frame', media.path, media.size],
    enabled: visible && !!media.url,
    queryFn: ({ signal }) => captureVideoThumbnail(media.url, signal),
    staleTime: Infinity,
    gcTime: 50 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return <div ref={container} className="relative flex size-full items-center justify-center bg-muted text-muted-foreground">
    {image ? <img src={image} alt={media.name} width={480} height={270} className="size-full object-contain" /> : <Film className="size-10" aria-label="Aperçu vidéo indisponible" />}
    <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-background/90 px-2 py-1 text-xs font-medium text-foreground"><Play className="size-3" />{formatDuration(media.duration)}</span>
  </div>;
}