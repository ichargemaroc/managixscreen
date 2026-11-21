import { useEffect, useRef, useState } from 'react';
import { displayWebpageUrl, webpageRefreshMs, youtubeEmbedUrl, WEBPAGE_TIMEOUT_MS } from '@/lib/webpage';
import { nativeWebpage } from './webpage-native';

export function WebpageStage({ url, name, fullscreen = true, refreshMinutes = 0, active = true, onError, onState }: { url: string; name: string; fullscreen?: boolean; refreshMinutes?: number; active?: boolean; onError: () => void; onState: (state: 'buffering' | 'playing' | 'paused' | 'error') => void }) {
  const [web, setWeb] = useState(false); const [revision, setRevision] = useState(0); const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const handlers = useRef({ onError, onState }); handlers.current = { onError, onState };
  const completed = useRef(false); const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rejected = useRef(false); const nativeClose = useRef<(() => void) | undefined>(undefined);
  const fail = () => { if (rejected.current) return; rejected.current = true; completed.current = true; clearTimeout(timeout.current); nativeClose.current?.(); setLoading(false); setFailed(true); handlers.current.onState('error'); handlers.current.onError(); };
  const loaded = () => { if (rejected.current) return; completed.current = true; clearTimeout(timeout.current); setLoading(false); handlers.current.onState('playing'); };
  useEffect(() => {
    if (!active) { handlers.current.onState('paused'); return; }
    let cancelled = false; let close: (() => void) | undefined; let refresh: ReturnType<typeof setInterval> | undefined;
    const session = crypto.randomUUID(); completed.current = false; rejected.current = false; setLoading(true); setFailed(false); setWeb(false); handlers.current.onState('buffering');
    timeout.current = setTimeout(fail, WEBPAGE_TIMEOUT_MS);
    void (async () => {
      try {
        const safeUrl = displayWebpageUrl(url); const native = await nativeWebpage();
        if (cancelled) return;
        if (native) {
          const listener = await native.listen(event => { if (cancelled || event.session !== session) return; if (event.state === 'loaded') loaded(); else { completed.current = false; fail(); } });
          close = () => { void listener.remove(); void native.close(session).catch(() => {}); };
          nativeClose.current = close;
          if (cancelled) { close(); return; }
          await native.open({ url: safeUrl, session, fullscreen, timeoutMs: WEBPAGE_TIMEOUT_MS });
          if (cancelled) { close(); return; }
          const interval = webpageRefreshMs(refreshMinutes);
          if (interval) refresh = setInterval(() => { if (rejected.current) return; completed.current = false; setLoading(true); timeout.current = setTimeout(fail, WEBPAGE_TIMEOUT_MS); void native.reload(session).catch(fail); }, interval);
        } else {
          setWeb(true);
          const interval = webpageRefreshMs(refreshMinutes);
          if (interval) refresh = setInterval(() => { if (rejected.current) return; completed.current = false; setLoading(true); timeout.current = setTimeout(fail, WEBPAGE_TIMEOUT_MS); setRevision(value => value + 1); }, interval);
        }
      } catch { if (!cancelled) fail(); }
    })();
    return () => { cancelled = true; clearTimeout(timeout.current); clearInterval(refresh); close?.(); nativeClose.current = undefined; };
  }, [url, refreshMinutes, fullscreen, active]);
  const youtube = !!youtubeEmbedUrl(url);
  return <div className={fullscreen ? 'tv-webpage' : 'tv-webpage tv-webpage-inset'}>
    {active && web && !failed && <iframe key={revision} title={name} src={displayWebpageUrl(url)} sandbox={youtube ? 'allow-scripts allow-same-origin allow-presentation' : 'allow-scripts allow-forms'} allow={youtube ? 'autoplay; encrypted-media; picture-in-picture' : undefined} referrerPolicy="no-referrer" onLoad={loaded} onError={fail} />}
    {active && loading && <p role="status" className="tv-webpage-status">Chargement de la page…</p>}
    {active && failed && <p role="alert" className="tv-webpage-status">Page Web indisponible.</p>}
  </div>;
}