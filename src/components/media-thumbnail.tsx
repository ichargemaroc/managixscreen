import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Film, Globe, ImageIcon } from 'lucide-react';
import { mediaThumbnailOptions, type Media } from '@/lib/store';

export function MediaThumbnail({ media }: { media: Media }) {
  const { data: url } = useQuery({ ...mediaThumbnailOptions(media), enabled: media.type === 'image' });
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const Icon = media.type === 'video' ? Film : media.type === 'webpage' ? Globe : ImageIcon;
  return url && url !== failedUrl
    ? <img src={url} alt={media.name} loading="lazy" className="size-full object-cover" onError={() => setFailedUrl(url)} />
    : <Icon className="size-5 text-muted-foreground" aria-label={media.type === 'image' ? 'Aperçu indisponible' : undefined} />;
}