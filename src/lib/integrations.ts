import { z } from 'zod';
import { webpageUrl } from './webpage';
export function canvaPublishedUrl(input:string){
 const url=new URL(webpageUrl(input));const host=url.hostname.toLowerCase();
 if(url.protocol!=='https:' || !['canva.com','www.canva.com'].includes(host) && !host.endsWith('.my.canva.site'))throw new Error('Utilisez le lien publié ou d’intégration fourni par Canva.');
 if(host.endsWith('.my.canva.site'))return url.href;
 if(!/^\/design\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?\/view\/?$/.test(url.pathname))throw new Error('Le lien Canva doit être public et en lecture seule, pas un lien d’édition.');
 // Preserve Canva’s published URL; do not invent an undocumented embed transformation.
 return url.href;
}
export function instagramPostUrl(input:string){
 const url=new URL(webpageUrl(input));if(url.protocol!=='https:' || !['instagram.com','www.instagram.com'].includes(url.hostname.toLowerCase()))throw new Error('Utilisez une publication Instagram publique.');
 const m=/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname);if(!m?.[1]||!m[2])throw new Error('Choisissez une publication ou un Reel public ; les profils et Stories ne sont pas pris en charge.');
 return `https://www.instagram.com/${m[1]}/${m[2]}/`;
}
export function instagramEmbedUrl(input:string){return `${instagramPostUrl(input)}embed/`;}
export const weatherLocationSchema=z.object({name:z.string().trim().min(1).max(80),latitude:z.coerce.number().finite().min(-89.9).max(89.9),longitude:z.coerce.number().finite().min(-180).max(180)});
export const weatherDataSchema=z.object({updatedAt:z.string(),forecastAt:z.string(),temperature:z.number(),wind:z.number(),symbol:z.string(),latitude:z.number(),longitude:z.number()});
export function roundedCoordinate(n:number){return Math.round(n*100)/100;}
export function displayOrigin(origin:string){const url=new URL(origin);return url.protocol==='https:'&&!url.hostname.endsWith('.localhost')&&url.hostname!=='localhost'?url.origin:'https://screenflow.live';}
export function weatherDisplayUrl(origin:string,input:z.infer<typeof weatherLocationSchema>){const location=weatherLocationSchema.parse(input);const params=new URLSearchParams({name:location.name,lat:String(roundedCoordinate(location.latitude)),lon:String(roundedCoordinate(location.longitude))});return `${displayOrigin(origin)}/display/weather?${params}`;}
export function instagramDisplayUrl(origin:string,input:string){return `${displayOrigin(origin)}/display/instagram?post=${encodeURIComponent(instagramPostUrl(input))}`;}
export function isScreenflowDisplay(input:string, currentOrigin:string):boolean {
 try {
  const url=new URL(input);const current=new URL(currentOrigin);
  if(url.username||url.password||!/^\/display\/(weather|instagram)$/.test(url.pathname))return false;
  return url.origin===current.origin || url.protocol==='https:'&&['screenflow.live','www.screenflow.live','managixscreen.lovable.app'].includes(url.host);
 } catch {return false;}
}
export function previewDisplayUrl(input:string,currentOrigin:string):string {
 const url=new URL(input);
 return isScreenflowDisplay(input,currentOrigin)?`${new URL(currentOrigin).origin}${url.pathname}${url.search}`:webpageUrl(input);
}