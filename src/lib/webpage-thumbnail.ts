import { displayWebpageUrl, youtubeEmbedUrl } from './webpage';
import { isScreenflowDisplay, previewDisplayUrl } from './integrations';

export function webpageThumbnailConfig(input: string, origin: string) {
  const trusted = isScreenflowDisplay(input, origin);
  const url = new URL(trusted ? previewDisplayUrl(input, origin) : displayWebpageUrl(input));
  if (youtubeEmbedUrl(input)) {
    url.searchParams.set('autoplay', '0');
    url.searchParams.set('mute', '1');
  }
  return {
    src: url.href,
    hostname: new URL(input).hostname,
    sandbox: trusted ? 'allow-scripts allow-same-origin' : 'allow-scripts',
  };
}