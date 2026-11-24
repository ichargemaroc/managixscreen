import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shouldPlayMusic } from '@/lib/background-music';
import { cachedMusic } from './cache';
import type { Content } from './protocol';

export function BackgroundMusic({ content, active, videoPlaying }: { content: Content; active: boolean; videoPlaying: boolean }) {
  const audio = useRef<HTMLAudioElement>(null); const current = useRef(content); current.current = content;
  const track = content.background_music;
  const [source, setSource] = useState(''); const [blocked, setBlocked] = useState(false); const [failed, setFailed] = useState(false);
  const playing = track ? shouldPlayMusic(track, active, videoPlaying) : false;
  useEffect(() => {
    let live = true; let url = ''; setSource(''); setBlocked(false); setFailed(false);
    if (track) void cachedMusic(current.current).then(blob => {
      if (!live) return;
      if (!blob) { setFailed(true); return; }
      url = URL.createObjectURL(blob); setSource(url);
    }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [track?.id, track?.size]);
  const start = () => {
    if (!playing || !audio.current) return;
    void audio.current.play().then(() => setBlocked(false)).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setBlocked(true);
    });
  };
  useEffect(() => {
    if (!audio.current) return;
    audio.current.volume = (track?.volume ?? 0) / 100;
    if (source && playing) start(); else audio.current.pause();
  }, [source, playing, track?.volume]);
  // Invoke in the gesture itself; effects alone cannot unlock audible Safari playback.
  useEffect(() => {
    const resume = () => start();
    document.addEventListener('pointerdown', resume); document.addEventListener('keydown', resume);
    return () => { document.removeEventListener('pointerdown', resume); document.removeEventListener('keydown', resume); };
  }, [source, playing]);
  return <>
    {source && <audio ref={audio} src={source} loop preload="auto" aria-label="Musique de fond" onError={() => setFailed(true)} />}
    {blocked && playing && !failed && <Button className="absolute bottom-24 right-6 z-50 bg-player-background text-player-foreground" variant="outline" onClick={start}><Volume2 />Activer la musique</Button>}
    {failed && active && track?.enabled && <p role="alert" className="absolute bottom-24 left-6 z-50 bg-player-background px-3 py-2 text-sm text-player-foreground">Musique indisponible ; contenu visuel conservé.</p>}
  </>;
}