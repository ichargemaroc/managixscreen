import { useCallback, useEffect, useRef, useState } from 'react';
import { cachedMedia } from './cache';
import { nextItem, imageDuration, missingMediaAction, type Content, type Item } from './protocol';
import { zoneRect, type Zone } from '@/lib/multi-zone';
import { WebpageStage } from './webpage-stage';
import { resolveSlideTransition, slideTransitionSchema } from '@/lib/slide-transition';
import { itemIsActive } from '@/lib/playlist-item-settings';

export function MultiZoneStage({ content, paused, onVideoPlaying, onWebpageError }: { content: Content; paused: boolean; onVideoPlaying?: (playing: boolean) => void; onWebpageError?: (code: string) => void }) {
  const videos = useRef(new Set<string>());
  const report = useCallback((id: string, playing: boolean) => { if (playing) videos.current.add(id); else videos.current.delete(id); onVideoPlaying?.(videos.current.size > 0); }, [onVideoPlaying]);
  useEffect(() => () => { onVideoPlaying?.(false); }, [onVideoPlaying]);
  return <div className="absolute inset-0 bg-player-background">{content.layout?.zones.map(z => <div key={`${content.layout?.id}:${content.layout?.revision}:${z.id}:${z.playlist?.updated_at}`} style={zoneRect(z)} className="absolute overflow-hidden"><ZonePlaylist content={content} zone={z} items={z.playlist?.items ?? []} paused={paused} reportVideo={report} {...(onWebpageError ? { onWebpageError } : {})} /></div>)}</div>;
}
function ZonePlaylist({ content, zone, items: allItems, paused, reportVideo, onWebpageError }: { content:Content;zone:Zone;items:Item[];paused:boolean;reportVideo: (id: string, playing: boolean) => void; onWebpageError?: (code: string) => void }) {
  // Failed zone pages keep their reason visible before the zone moves on, like the full-screen player.
  const [webpageFailed,setWebpageFailed]=useState('');
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const items = allItems.filter(entry => itemIsActive(entry.schedule, now + (content.clock_offset ?? 0)));
  const [index,setIndex] = useState(0); const [source,setSource] = useState(''); const [error,setError] = useState(''); const video=useRef<HTMLVideoElement>(null); const latest=useRef(content);latest.current=content;const item=items[index % Math.max(1,items.length)];
  const transition = item?.transition ?? content.layout?.zones.find(z => z.id === zone.id)?.playlist?.slide_transition ?? 'default';
  const [webpageReady, setWebpageReady] = useState(false);
  useEffect(()=>{ if(items.length && index>=items.length) setIndex(0); },[items.length,index]);
  // Hors connexion : sauter les médias locaux manquants au lieu de figer la zone.
  const missing=useRef(0);
  const next=()=>setIndex(i=>nextItem(i,items.length));
  useEffect(() => { reportVideo(zone.id, !paused && item?.media.type === 'video'); return () => reportVideo(zone.id, false); }, [zone.id, item?.media.type, paused, reportVideo]);
  useEffect(()=>{ let active=true;let url='';let skip:number|undefined;setSource('');setError('');setWebpageReady(false);if(item?.media.type === 'webpage'){missing.current=0;setSource(item.media.webpage_url ?? '');return;}
    if(item) void cachedMedia(latest.current,item).then(blob=>{if(!active)return;if(blob){missing.current=0;url=URL.createObjectURL(blob);setSource(url);return;}throw new Error('missing');}).catch(()=>{if(!active)return;missing.current+=1;if(missingMediaAction(missing.current,items.length)==='stop')setError('Aucun média local disponible hors connexion.');else{setError('Média local manquant ; passage au suivant.');skip=window.setTimeout(()=>{if(active)next();},1500);}});return()=>{active=false;if(skip)clearTimeout(skip);if(url)URL.revokeObjectURL(url);};
  },[item?.id,item?.media.id,item?.media.size,item?.media.type,item?.media.webpage_url]);
  useEffect(()=>{if(!item || !source || paused || item.media.type==='video' || item.media.type==='webpage' && !webpageReady)return;const timer=setTimeout(next,imageDuration(item));return()=>clearTimeout(timer);},[item,source,paused,items.length,webpageReady]);
  useEffect(()=>{if(!item||webpageFailed!==`${index}:${item.id}`)return;const timer=setTimeout(next,5000);return()=>clearTimeout(timer);},[webpageFailed,index,item?.id,items.length]);
  useEffect(()=>{if(paused)video.current?.pause();else void video.current?.play().catch(()=>setError('Lecture audio bloquée.'));},[paused,source]);
  if(!item)return <div className="flex size-full items-center justify-center text-player-foreground">Zone sans contenu</div>;
  return <div className="relative size-full">{item.media.type==='webpage' ? <WebpageStage key={item.id} url={source || item.media.webpage_url || ''} name={item.media.name} fullscreen refreshMinutes={item.media.refresh_minutes ?? 0} active={!paused} rotation={content.display_rotation ?? 0} rectangle={zone} muted={!zone.audio} onState={state=>setWebpageReady(state==='playing')} onError={code=>{onWebpageError?.(code);if(items.length>1)setWebpageFailed(`${index}:${item.id}`);}} /> : source && <div key={`${index}:${item.id}`} className="tv-stage" data-transition={resolveSlideTransition(slideTransitionSchema.catch('default').parse(transition),`${zone.id}:${index}:${item.id}`)}>{item.media.type==='image' ? <img src={source} alt={item.media.name} className="size-full object-contain" /> : <video ref={video} src={source} autoPlay playsInline muted={!zone.audio} loop={items.length===1} className="size-full object-contain" onEnded={next} onError={()=>{setError('Vidéo incompatible.');if(items.length>1)setTimeout(next,3000);}} />}</div>}{error && <p role="alert" className="absolute bottom-2 left-2 bg-player-background px-3 py-1 text-sm text-player-foreground">{error}</p>}</div>;
}