import { useEffect, useRef, useState } from 'react';
import { cachedMedia } from './cache';
import { nextItem, imageDuration, type Content, type Item } from './protocol';
import { zoneRect, type Zone } from '@/lib/multi-zone';
import { WebpageStage } from './webpage-stage';

export function MultiZoneStage({ content, paused }: { content: Content; paused: boolean }) {
  return <div className="absolute inset-0 bg-player-background">{content.layout?.zones.map(z => <div key={`${content.layout?.id}:${content.layout?.revision}:${z.id}:${z.playlist?.updated_at}`} style={zoneRect(z)} className="absolute overflow-hidden"><ZonePlaylist content={content} zone={z} items={z.playlist?.items ?? []} paused={paused} /></div>)}</div>;
}
function ZonePlaylist({ content, zone, items, paused }: { content:Content;zone:Zone;items:Item[];paused:boolean }) {
  const [index,setIndex] = useState(0); const [source,setSource] = useState(''); const [error,setError] = useState(''); const video=useRef<HTMLVideoElement>(null); const latest=useRef(content);latest.current=content;const item=items[index];
  const next=()=>setIndex(i=>nextItem(i,items.length));
  useEffect(()=>{ let active=true;let url='';setSource('');setError('');if(item?.media.type === 'webpage'){setSource(item.media.webpage_url ?? '');return;}
    if(item) void cachedMedia(latest.current,item).then(blob=>{if(active && blob){url=URL.createObjectURL(blob);setSource(url);}}).catch(()=>{if(active)setError('Média indisponible.');});return()=>{active=false;if(url)URL.revokeObjectURL(url);};
  },[item?.id,item?.media.id,item?.media.size,item?.media.type,item?.media.webpage_url]);
  useEffect(()=>{if(!item || !source || paused || item.media.type==='video')return;const timer=setTimeout(next,imageDuration(item));return()=>clearTimeout(timer);},[item,source,paused,items.length]);
  useEffect(()=>{if(paused)video.current?.pause();else void video.current?.play().catch(()=>setError('Lecture audio bloquée.'));},[paused,source]);
  if(!item)return <div className="flex size-full items-center justify-center text-player-foreground">Zone sans contenu</div>;
  return <div className="relative size-full">{item.media.type==='webpage' ? <WebpageStage url={source || item.media.webpage_url || ''} name={item.media.name} fullscreen refreshMinutes={item.media.refresh_minutes ?? 0} active={!paused} rotation={content.display_rotation ?? 0} rectangle={zone} muted={!zone.audio} onState={()=>{}} onError={()=>{setError('Page indisponible.');if(items.length>1)next();}} /> : source && (item.media.type==='image' ? <img src={source} alt={item.media.name} className="size-full object-contain" /> : <video ref={video} src={source} autoPlay playsInline muted={!zone.audio} loop={items.length===1} className="size-full object-contain" onEnded={next} onError={()=>{setError('Vidéo incompatible.');}} />)}{error && <p role="alert" className="absolute bottom-2 left-2 bg-player-background px-3 py-1 text-sm text-player-foreground">{error}</p>}</div>;
}