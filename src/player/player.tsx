import { useEffect, useRef, useState } from "react";
import { Cast, Maximize, RefreshCw, Wifi, WifiOff, Monitor, Play, Pause, ChevronRight, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cachedMedia, clearMediaCache, commandReceipt, downloadContent, readContent, saveReceipt } from "./cache";
import { contentSchema, credentialsSchema, commandsSchema, deviceApi, DeviceApiError, imageDuration, nextItem, type Content, type Credentials } from "./protocol";
import { enterPlayerMode, keepAwake, readCredentials, saveCredentials, subscribeNetwork } from "./platform";
import { QRCodeSVG } from "qrcode.react";
import { pairingUrl } from "@/lib/qr-pairing";
// Bundled locally so the logo also shows inside the offline Android app (relative CDN URLs do not resolve there).
import markUrl from "./screenflow-mark.png";
import { WallStage } from "./wall-stage";
import { PositionStage } from "./position-stage";
import { receivedPositionTest, type PositionTest } from "@/lib/position-test";
import { flushSync } from "react-dom";
import { focusPlayerButton, subscribePlayerBack } from "./tv-navigation";
import { vaultError, vaultErrorMessage } from "./vault-errors";

export function TVPlayer() {
  const [positionTest, setPositionTest] = useState<PositionTest | null>(null);
  const commandBusy = useRef(false);
  const [identity, setIdentity] = useState<Credentials | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [phase, setPhase] = useState<"boot" | "ready" | "pairing" | "playing" | "revoked" | "storage-error">("boot");
  const [nativePlayer, setNativePlayer] = useState(false);
  const playerVersion = import.meta.env['VITE_PLAYER_VERSION_NAME'] || '1.0.0';
  // Short source revision lets support confirm which compilation is installed.
  const playerBuild = String(import.meta.env['VITE_PLAYER_BUILD'] ?? '').slice(0, 7);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(true);
  const [progress, setProgress] = useState("");
  const [index, setIndex] = useState(0);
  const [source, setSource] = useState("");
  const [paused, setPaused] = useState(false);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [controls, setControls] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [now, setNow] = useState(0);
  const controlsOpen = useRef(controls); controlsOpen.current = controls;
  const current = useRef({ identity, content, index, paused }); current.current = { identity, content, index, paused };
  const busy = useRef(false);
  const playback = useRef<"idle" | "playing" | "paused" | "error">("idle");
  const video = useRef<HTMLVideoElement>(null);
  const items = content?.playlist?.items ?? [];
  const item = items[index];

  const startVideo = () => {
    const element = video.current;
    if (!element) return;
    // Invoke play in the click/key event itself: browsers require that gesture for sound.
    void element.play().catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setPlaybackBlocked(true); setError("Lecture vidéo bloquée. Appuyez sur Lecture."); setControls(true);
    });
  };
  const togglePlayback = () => {
    if (paused || playbackBlocked) { setPaused(false); startVideo(); }
    else setPaused(true);
  };

  useEffect(() => {
    let active = true; let stopNetwork: (() => void) | undefined; let stopAwake: (() => void) | undefined;
    void (async () => {
      try {
        // A failed identity read blocks enrollment; only the media cache may fall back.
        const { Capacitor } = await import('@capacitor/core');
        if (active) setNativePlayer(Capacitor.isNativePlatform());
        const timeout = <T,>(task: Promise<T>, fallback: T) => Promise.race([task.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), 5000))]);
        const stored = await Promise.race([readCredentials(), new Promise<never>((_, reject) => setTimeout(() => reject(vaultError("VAULT_TIMEOUT")), 20000))]);
        const cached = stored?.paired ? await timeout(readContent(), null) : null;
        if (!active) return;
        setNativePlayer(Capacitor.isNativePlatform()); setNow(Date.now()); setIdentity(stored); setContent(cached); setPhase(stored?.paired ? "playing" : stored ? "pairing" : "ready");
        void subscribeNetwork(setOnline).then((stop) => { if (active) stopNetwork = stop; else stop(); }).catch(() => {}); void keepAwake().then((stop) => { if (active) stopAwake = stop; else stop(); }).catch(() => {});
        void navigator.storage?.persist?.();
      } catch (e) { if (active) { setError(vaultErrorMessage(e)); setPhase("storage-error"); } }
    })();
    return () => { active = false; stopNetwork?.(); stopAwake?.(); };
  }, []);

  const connect = async () => {
    if (requesting) return;
    setRequesting(true); setError(""); void enterPlayerMode();
    try {
      const response = await deviceApi("request", null, { device_name: nativePlayer ? "ScreenFlow TV" : "Lecteur TV web", device_metadata: { platform: nativePlayer ? "android-tv" : "web-player" } });
      const value = response as Record<string, unknown>;
      const creds = credentialsSchema.parse({ ...value, expires_at: Date.now() + Number(value['expires_in']) * 1000, paired: false });
      await saveCredentials(creds); setNow(Date.now()); setIdentity(creds); setPhase("pairing");
    } catch (e) { setError(e instanceof Error ? e.message : "Le jumelage est indisponible."); }
    finally { setRequesting(false); }
  };

  const sync = async (creds: Credentials) => {
    const sent = Date.now();
    const manifest = contentSchema.parse(await deviceApi("content", creds));
    if (manifest.server_time) manifest.clock_offset = Date.parse(manifest.server_time) - (sent + Date.now()) / 2;
    await downloadContent(manifest, (done, total) => setProgress(`${done} / ${total}`));
    const previous = current.current.content;
    setContent(manifest);
    if (previous?.playlist?.id !== manifest.playlist?.id || previous?.playlist?.updated_at !== manifest.playlist?.updated_at) setIndex(0);
    setProgress(""); setError("");
  };

  useEffect(() => {
    if (!identity || phase === "revoked") return;
    let cancelled = false;
    const tick = async () => {
      if (busy.current || !navigator.onLine) return;
      busy.current = true;
      try {
        if (!identity.paired) {
          if (identity.expires_at <= Date.now()) return;
          const status = await deviceApi("status", identity) as { status: string; paired: boolean };
          if (status.status === "expired") { setNow(identity.expires_at); return; }
          if (status.paired && !cancelled) { const claimed = { ...identity, paired: true }; await saveCredentials(claimed); setIdentity(claimed); setPhase("playing"); }
          return;
        }
        await deviceApi("heartbeat", identity, { player_version: `${nativePlayer ? 'android-tv' : 'web'}-${playerVersion}`, playback_status: { state: playback.current, playlist_id: current.current.content?.playlist?.id ?? null, media_id: current.current.content?.playlist?.items[current.current.index]?.media.id ?? null } });
        try { await sync(identity); } catch (e) { if (e instanceof DeviceApiError && e.status === 401) throw e; setProgress(""); setError("Synchronisation interrompue ; contenu local conservé."); }

      } catch (e) {
        if (e instanceof DeviceApiError && e.status === 401) {
          await saveCredentials(null); await clearMediaCache(); setContent(null); setSource(""); setIdentity(null); setPhase("revoked"); setPositionTest(null);
        }
        if (!cancelled) setError(e instanceof Error ? e.message : "Synchronisation indisponible.");
        setProgress("");
      } finally { busy.current = false; }
    };
    // Leave request capacity for the independent command poll and its acknowledgements.
    void tick(); const timer = window.setInterval(() => void tick(), identity.paired ? content?.wall ? 15000 : 30000 : 5000);
    const resume = () => void tick(); window.addEventListener("online", resume);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener("online", resume); };
  }, [identity, phase, content?.wall?.id, nativePlayer, playerVersion]);

  // Independent of media downloads: position commands must also reach a player without content.
  useEffect(() => {
    if (!identity?.paired || phase === "revoked") return;
    let cancelled = false;
    let retryAfter = 0;
    const poll = async () => {
      if (commandBusy.current || !navigator.onLine || Date.now() < retryAfter) return;
      commandBusy.current = true;
      try {
        const sent = Date.now();
        const response = await deviceApi("commands", identity);
        const queue = commandsSchema.parse(response);
        const server = queue.server_time ? Date.parse(queue.server_time) : sent;
        const serverNow = server + (Date.now() - sent) / 2;
        for (const command of queue.commands) {
          if (cancelled || Date.parse(command.expires_at) <= serverNow) continue;
          let receipt = await commandReceipt(command.id);
          let restart = false;
          if (!receipt) {
            try {
              if (command.command === "position_test") {
                const test = receivedPositionTest(command.payload, Date.parse(command.expires_at) - serverNow);
                // Commit the full-screen surface before acknowledging its execution.
                flushSync(() => { setPositionTest(test); setNow(Date.now()); });
                await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
              }
              if (command.command === "stop_position_test") {
                const payload = command.payload as { wall_id?: unknown } | null;
                if (!payload || typeof payload.wall_id !== "string") throw new Error("Commande invalide");
                flushSync(() => setPositionTest(previous => previous?.wall_id === payload.wall_id ? null : previous));
              }
              if (command.command === "clear_cache") { await clearMediaCache(); setContent(null); await sync(identity); }
              if (command.command === "refresh_content" || command.command === "reload_playlist") { await sync(identity); if (command.command === "reload_playlist") setIndex(0); }
              restart = command.command === "restart_player";
              receipt = restart ? { status: "completed", restartPending: true } : { status: "completed" };
            } catch { receipt = { status: "failed", error: "L’opération du lecteur a échoué." }; }
            await saveReceipt(command.id, receipt);
          }
          if (restart) { window.location.reload(); return; }
          if (receipt.restartPending) { receipt = { status: "completed" }; await saveReceipt(command.id, receipt); }
          await deviceApi("commands/ack", identity, { command_id: command.id, status: receipt.status, ...(receipt.error ? { error: receipt.error } : {}) });
        }
      } catch (e) {
        if (e instanceof DeviceApiError && e.status === 429) retryAfter = Date.now() + 60000;
        if (e instanceof DeviceApiError && e.status === 401) { setPositionTest(null); setPhase("revoked"); }
      } finally { commandBusy.current = false; }
    };
    void poll(); const timer = window.setInterval(() => void poll(), 5000);
    window.addEventListener("online", poll);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener("online", poll); };
  }, [identity, phase]);
  useEffect(() => {
    if (!positionTest) return;
    const timer = setTimeout(() => setPositionTest(null), Math.max(0, positionTest.deadline - Date.now()));
    return () => clearTimeout(timer);
  }, [positionTest]);

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let active = true; let url = ""; setSource(""); playback.current = "idle";
    if (content && item) void cachedMedia(content, item).then((blob) => { if (active && blob) { url = URL.createObjectURL(blob); setSource(url); } }).catch(() => setError("Le média local est indisponible."));
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [content?.playlist?.id, content?.playlist?.updated_at, item?.id]);
  useEffect(() => {
    if (positionTest || content?.wall || !item || !source || paused || item.media.type !== "image") return;
    playback.current = "playing";
    const timer = setTimeout(() => setIndex((value) => nextItem(value, items.length)), imageDuration(item)); return () => clearTimeout(timer);
  }, [item?.id, item?.display_duration, source, paused, items.length, content?.wall?.id, positionTest]);
  useEffect(() => { if (paused || (positionTest && !content?.wall)) { playback.current = "paused"; video.current?.pause(); } else startVideo(); }, [paused, source, positionTest, content?.wall?.id]);
  useEffect(() => {
    let active = true; let stop: (() => void) | undefined;
    void subscribePlayerBack(() => {
      if (!controlsOpen.current) return false;
      setControls(false); return true;
    }).then(cleanup => { if (active) stop = cleanup; else cleanup(); }).catch(() => {});
    return () => { active = false; stop?.(); };
  }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "BrowserBack") {
        if (controlsOpen.current) { event.preventDefault(); setControls(false); }
        return;
      }
      if (positionTest) return;
      if ((event.key === " " || event.key === "MediaPlayPause") && phase === "playing" && !content?.wall) { event.preventDefault(); togglePlayback(); }
      else if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        if (phase === "playing" && source && !controlsOpen.current) setControls(true);
        else focusPlayerButton(event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1);
      } else if (event.key === "Enter" && phase === "playing" && source && !controlsOpen.current) {
        event.preventDefault(); setControls(true);
      }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [phase, source, content?.wall?.id, positionTest, paused, playbackBlocked]);
  useEffect(() => {
    if (!controls) return;
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(".tv-controls button:not(:disabled)")?.focus();
    });
    const timer = setTimeout(() => {
      if (!document.activeElement?.closest(".tv-controls")) setControls(false);
    }, 6000);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [controls]);

  const expired = identity && !identity.paired && now >= identity.expires_at;
  const qrUrl = phase === "pairing" && identity && !expired ? pairingUrl(import.meta.env['VITE_PLAYER_API_ORIGIN'] || window.location.origin, identity.pairing_code) : "";
  return <main className="tv-player text-xl" onPointerMove={() => phase === "playing" && setControls(true)}>
    {phase === "playing" && source && item ? <div className="tv-stage">
      {content?.wall ? <WallStage wall={content.wall} source={source} type={item.media.type} clockOffset={content.clock_offset ?? 0} onState={(state) => { playback.current = state; }} /> : item.media.type === "image" ? <img src={source} alt={item.media.name} /> : <video ref={video} src={source} autoPlay playsInline loop={items.length === 1} onPlaying={() => { playback.current = "playing"; if (playbackBlocked) { setPlaybackBlocked(false); setError(""); } }} onEnded={() => setIndex((value) => nextItem(value, items.length))} onError={() => { playback.current = "error"; setError("Format vidéo non pris en charge par cet appareil."); setTimeout(() => setIndex((value) => nextItem(value, items.length)), 3000); }} />}
    </div> : <div className="tv-enrollment">
      <header className="tv-brand"><img src={markUrl} alt="" className="tv-brand-mark" /><span>ScreenFlow <small>TV PLAYER</small></span></header>
      <div className="tv-center">
        {!qrUrl && <Monitor className="tv-display-icon" aria-hidden="true" />}
        <p className="tv-eyebrow">{phase === "playing" ? "APPAREIL JUMELÉ" : "CONNEXION DE L’ÉCRAN"}</p>
        <h1>{phase === "boot" ? "Démarrage du lecteur" : phase === "storage-error" ? "Stockage sécurisé indisponible" : phase === "playing" ? "En attente de contenu" : phase === "pairing" && !expired ? "Jumeler cet écran" : expired ? "Code expiré" : phase === "revoked" ? "Accès révoqué" : "ScreenFlow TV"}</h1>
        {phase === "storage-error" ? <Button autoFocus size="lg" onClick={() => window.location.reload()}><RefreshCw />Réessayer le démarrage</Button> : phase === "pairing" && !expired ? <><div className="tv-code" aria-label={`Code de jumelage ${identity?.pairing_code}`}>{identity?.pairing_code.split("").map((digit, i) => <span key={i}>{digit}</span>)}</div><p>Code valable encore {Math.max(0, Math.ceil(((identity?.expires_at ?? now) - now) / 60000))} min</p></> : phase === "playing" ? <p>{progress ? `Téléchargement des médias · ${progress}` : "Aucune playlist disponible sur cet écran."}</p> : phase !== "boot" && <Button autoFocus className="min-h-12 text-lg" size="lg" disabled={requesting || !online} onClick={() => void connect()}><Cast />{requesting ? "Connexion…" : expired ? "Obtenir un nouveau code" : "Connecter cet écran"}</Button>}
        {qrUrl && <div className="tv-qr"><QRCodeSVG value={qrUrl} size={200} level="M" marginSize={4} fgColor="var(--qr-foreground)" bgColor="var(--qr-background)" title="QR code de jumelage" /><p>Appairage par QR code</p></div>}
        {error && <p role="alert" className="tv-error">{error}</p>}
      </div>
      <footer className="tv-footer"><span className="text-base">{online ? <Wifi /> : <WifiOff />}{online ? "Réseau disponible" : "Hors connexion"}</span><span className="text-base">{nativePlayer ? "LECTEUR ANDROID TV" : "LECTEUR WEB"} · {playerVersion}{playerBuild ? ` · ${playerBuild}` : ""}</span><Button className="min-h-12 min-w-12" variant="ghost" size="icon" aria-label="Plein écran" onClick={() => void enterPlayerMode()}><Maximize /></Button></footer>
    </div>}
    {phase === "playing" && source && controls && <div className="tv-controls"><span>{online ? <Wifi /> : <WifiOff />}{content?.playlist?.name} · {index + 1}/{items.length}{progress && ` · ${progress}`}</span><div><Button disabled={Boolean(content?.wall)} variant="ghost" size="icon" aria-label={paused || playbackBlocked ? "Lecture" : "Pause"} onClick={togglePlayback}>{paused || playbackBlocked ? <Play /> : <Pause />}</Button><Button disabled={Boolean(content?.wall)} variant="ghost" size="icon" aria-label="Média suivant" onClick={() => setIndex((value) => nextItem(value, items.length))}><ChevronRight /></Button><Button variant="ghost" size="icon" aria-label="Synchroniser" disabled={busy.current || !identity || !online} onClick={() => { if (identity && !busy.current) { busy.current = true; void sync(identity).catch(() => setError("Synchronisation indisponible.")).finally(() => { busy.current = false; }); } }}><RefreshCw /></Button><Button variant="ghost" size="icon" aria-label="Plein écran" onClick={() => void enterPlayerMode()}><Maximize /></Button></div>{error && <p role="alert">{error}</p>}</div>}
    {phase === "playing" && source && !controls && <Button className="tv-menu" variant="ghost" size="icon" aria-label="Commandes de lecture" onClick={() => setControls(true)}><Settings2 /></Button>}
    {positionTest && <PositionStage test={positionTest} now={now} />}
  </main>;
}