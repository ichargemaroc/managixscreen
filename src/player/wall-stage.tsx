import { useEffect, useRef, useState } from 'react';
import { wallMediaRect, wallPosition, wallViewport, type WallPlayback } from '@/lib/video-wall';
export function WallStage({ wall, source, type, clockOffset, onState }: { wall:WallPlayback; source:string; type:'image'|'video'; clockOffset:number; onState:(state:'idle'|'playing'|'paused'|'error')=>void }) {
  const canvas=useRef<HTMLCanvasElement>(null); const media=useRef<HTMLVideoElement>(null);
  const [failed,setFailed]=useState(false);
  const latest=useRef({wall,clockOffset,onState}); latest.current={wall,clockOffset,onState};
  useEffect(()=>{
    let active=true; let frame=0; let lastCorrection=0;
    const image=new Image(); if(type==='image') image.src=source;
    const draw=()=>{
      if(!active) return;
      const {wall:w,clockOffset:offset,onState:report}=latest.current;
      const el=canvas.current; const video=media.current; const ctx=el?.getContext('2d');
      const serverNow=Date.now()+offset; const running=w.state==='playing' && serverNow>=Date.parse(w.epoch);
      const visible=w.state!=='stopped' && (w.state!=='playing' || running);
      if(video){
        if(Number.isFinite(video.duration) && video.duration>0 && performance.now()-lastCorrection>500){
          const target=wallPosition(w,serverNow,video.duration); let delta=target-video.currentTime;
          if(Math.abs(delta)>video.duration/2) delta-=Math.sign(delta)*video.duration;
          if(Math.abs(delta)>0.25) video.currentTime=target;
          video.playbackRate=running ? Math.max(0.97,Math.min(1.03,1+delta*0.1)):1;
          lastCorrection=performance.now();
        }
        if(running && video.paused) void video.play().catch(()=>{setFailed(true);report('error');});
        if(!running && !video.paused) video.pause();
      }
      if(el && ctx){
        const box=el.getBoundingClientRect(); const width=Math.max(1,Math.round(box.width)); const height=Math.max(1,Math.round(box.height));
        if(el.width!==width || el.height!==height){el.width=width;el.height=height;}
        ctx.clearRect(0,0,width,height);
        const sourceEl=type==='image'?image:video;
        const sw=type==='image'?image.naturalWidth:video?.videoWidth??0; const sh=type==='image'?image.naturalHeight:video?.videoHeight??0;
        if(visible && sourceEl && sw && sh){
          const viewport=wallViewport(w); const rect=wallMediaRect(w,sw,sh);
          // Letterbox locally as well when a physical TV has a different aspect ratio.
          const scale=Math.min(width/viewport.width,height/viewport.height);
          ctx.save(); ctx.translate((width-viewport.width*scale)/2,(height-viewport.height*scale)/2); ctx.scale(scale,scale);
          ctx.beginPath();ctx.rect(0,0,viewport.width,viewport.height);ctx.clip();
          ctx.drawImage(sourceEl,rect.x-viewport.x,rect.y-viewport.y,rect.width,rect.height);ctx.restore();
          report(running?'playing':w.state==='paused'?'paused':'idle');
        }
      }
      frame=requestAnimationFrame(draw);
    };
    setFailed(false); image.onerror=()=>{setFailed(true);latest.current.onState('error');};
    frame=requestAnimationFrame(draw);
    return()=>{active=false;cancelAnimationFrame(frame);};
  },[source,type]);
  return <div className="tv-wall-stage"><canvas ref={canvas} aria-label={`${wall.name} — ligne ${wall.row_index+1}, colonne ${wall.column_index+1}`} />{type==='video' && <video className="tv-wall-decoder" ref={media} src={source} muted playsInline loop preload="auto" onError={()=>{setFailed(true);onState('error');}} />}{failed && <p role="alert" className="tv-error">Ce média ne peut pas être lu sur cet appareil.</p>}</div>;
}
