import { useEffect, useRef, useState } from "react";
import { Cast, Maximize, RefreshCw, Wifi, WifiOff, Monitor, Play, Pause, ChevronRight, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cachedMedia, clearMediaCache, commandReceipt, downloadContent, readContent, saveReceipt } from "./cache";
import { contentSchema, credentialsSchema, commandsSchema, deviceApi, DeviceApiError, imageDuration, nextItem, type Content, type Credentials } from "./protocol";
import { enterPlayerMode, keepAwake, readCredentials, saveCredentials, subscribeNetwork } from "./platform";
import { QRCodeSVG } from "qrcode.react";
import { pairingUrl } from "@/lib/qr-pairing";

export function TVPlayer() {
  const [identity, setIdentity] = useState<Credentials | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [phase, setPhase] = useState<"boot" | "ready" | "pairing" | "playing" | "revoked">("boot");
  const [error, setError] = useState("");
  const [online, setOnline] = useState(true);
  const [progress, setProgress] = useState("");
  const [index, setIndex] = useState(0);
  const [source, setSource] = useState("");
  const [paused, setPaused] = useState(false);
  const [controls, setControls] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [now, setNow] = useState(0);
  const current = useRef({ identity, content, index, paused }); current.current = { identity, content, index, paused };
  const busy = useRef(false);
  const playback = useRef<"idle" | "playing" | "paused" | "error">("idle");
  const video = useRef<HTMLVideoElement>(null);
  const items = content?.playlist?.items ?? [];
  const item = items[index];

  useEffect(() => {
    let active = true; let stopNetwork: (() => void) | undefined; let stopAwake: (() => void) | undefined;
    void (async () => {
      try {
        const stored = await readCredentials();
        const cached = stored?.paired ? await readContent().catch(() => null) : null;
        if (!active) return;
        setNow(Date.now()); setIdentity(stored); setContent(cached); setPhase(stored?.paired ? "playing" : stored ? "pairing" : "ready");
        stopNetwork = await subscribeNetwork(setOnline); stopAwake = await keepAwake();
        void navigator.storage?.persist?.();
      } catch { if (active) { setError("Le stockage du lecteur est indisponible."); setPhase("ready"); } }
    })();
    return () => { active = false; stopNetwork?.(); stopAwake?.(); };
  }, []);

  const connect = async () => {
    if (requesting) return;
    setRequesting(true); setError(""); void enterPlayerMode();
    try {
      const response = await deviceApi("request", null, { device_name: "Lecteur TV web", device_metadata: { platform: "web-player" } });
      const value = response as Record<string, unknown>;
      const creds = credentialsSchema.parse({ ...value, expires_at: Date.now() + Number(value['expires_in']) * 1000, paired: false });
      await saveCredentials(creds); setNow(Date.now()); setIdentity(creds); setPhase("pairing");
    } catch (e) { setError(e instanceof Error ? e.message : "Le jumelage est indisponible."); }
    finally { setRequesting(false); }
  };

  const sync = async (creds: Credentials) => {
    const manifest = contentSchema.parse(await deviceApi("content", creds));
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
        await deviceApi("heartbeat", identity, { player_version: "web-0.1.0", playback_status: { state: playback.current, playlist_id: current.current.content?.playlist?.id ?? null, media_id: current.current.content?.playlist?.items[current.current.index]?.media.id ?? null } });
        try { await sync(identity); } catch (e) { if (e instanceof DeviceApiError && e.status === 401) throw e; setProgress(""); setError("Synchronisation interrompue ; contenu local conservé."); }
        const queue = commandsSchema.parse(await deviceApi("commands", identity));
        for (const command of queue.commands) {
          if (cancelled || Date.parse(command.expires_at) <= Date.now()) continue;
          let receipt = await commandReceipt(command.id);
          let restart = false;
          if (!receipt) {
            try {
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
        if (e instanceof DeviceApiError && e.status === 401) {
          await saveCredentials(null); await clearMediaCache(); setContent(null); setSource(""); setIdentity(null); setPhase("revoked");
        }
        if (!cancelled) setError(e instanceof Error ? e.message : "Synchronisation indisponible.");
        setProgress("");
      } finally { busy.current = false; }
    };
    void tick(); const timer = window.setInterval(() => void tick(), identity.paired ? 30000 : 5000);
    const resume = () => void tick(); window.addEventListener("online", resume);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener("online", resume); };
  }, [identity, phase]);

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let active = true; let url = ""; setSource(""); playback.current = "idle";
    if (content && item) void cachedMedia(content, item).then((blob) => { if (active && blob) { url = URL.createObjectURL(blob); setSource(url); } }).catch(() => setError("Le média local est indisponible."));
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [content?.playlist?.id, content?.playlist?.updated_at, item?.id]);
  useEffect(() => {
    if (!item || !source || paused || item.media.type !== "image") return;
    playback.current = "playing";
    const timer = setTimeout(() => setIndex((value) => nextItem(value, items.length)), imageDuration(item)); return () => clearTimeout(timer);
  }, [item?.id, item?.display_duration, source, paused, items.length]);
  useEffect(() => { if (paused) { playback.current = "paused"; video.current?.pause(); } else if (video.current) void video.current.play().catch(() => { setError("Lecture vidéo bloquée. Appuyez sur Lecture."); setControls(true); }); }, [paused, source]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "BrowserBack") setControls(true);
      if (event.key === "ArrowRight" && phase === "playing") { event.preventDefault(); setIndex((value) => nextItem(value, items.length)); }
      else if (event.key === " " || event.key === "MediaPlayPause") { event.preventDefault(); setPaused((value) => !value); }
      else if (event.key === "Escape" || event.key === "BrowserBack") setControls((value) => !value);
      else if (event.key.startsWith("Arrow")) {
        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".tv-player button:not(:disabled)"));
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement); buttons[(at + 1) % buttons.length]?.focus();
      }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [phase, items.length]);
  useEffect(() => { if (!controls) return; const timer = setTimeout(() => setControls(false), 6000); return () => clearTimeout(timer); }, [controls]);

  const expired = identity && !identity.paired && now >= identity.expires_at;
  const qrUrl = phase === "pairing" && identity && !expired ? pairingUrl(import.meta.env['VITE_PLAYER_API_ORIGIN'] || window.location.origin, identity.pairing_code) : "";
  return <main className="tv-player" onPointerMove={() => phase === "playing" && setControls(true)}>
    {phase === "playing" && source && item ? <div className="tv-stage">
      {item.media.type === "image" ? <img src={source} alt={item.media.name} /> : <video ref={video} src={source} autoPlay muted playsInline loop={items.length === 1} onPlaying={() => { playback.current = "playing"; }} onEnded={() => setIndex((value) => nextItem(value, items.length))} onError={() => { playback.current = "error"; setError("Format vidéo non pris en charge par cet appareil."); setTimeout(() => setIndex((value) => nextItem(value, items.length)), 3000); }} />}
    </div> : <div className="tv-enrollment">
      <header className="tv-brand"><Cast aria-hidden="true" /><span>ScreenFlow <small>TV PLAYER</small></span></header>
      <div className="tv-center">
        {!qrUrl && <Monitor className="tv-display-icon" aria-hidden="true" />}
        <p className="tv-eyebrow">{phase === "playing" ? "APPAREIL JUMELÉ" : "CONNEXION DE L’ÉCRAN"}</p>
        <h1>{phase === "boot" ? "Démarrage du lecteur" : phase === "playing" ? "En attente de contenu" : phase === "pairing" && !expired ? "Jumeler cet écran" : expired ? "Code expiré" : phase === "revoked" ? "Accès révoqué" : "ScreenFlow TV"}</h1>
        {phase === "pairing" && !expired ? <><div className="tv-code" aria-label={`Code de jumelage ${identity?.pairing_code}`}>{identity?.pairing_code.split("").map((digit, i) => <span key={i}>{digit}</span>)}</div><p>Code valable encore {Math.max(0, Math.ceil(((identity?.expires_at ?? now) - now) / 60000))} min</p></> : phase === "playing" ? <p>{progress ? `Téléchargement des médias · ${progress}` : "Aucune playlist disponible sur cet écran."}</p> : phase !== "boot" && <Button autoFocus size="lg" disabled={requesting || !online} onClick={() => void connect()}><Cast />{requesting ? "Connexion…" : expired ? "Obtenir un nouveau code" : "Connecter cet écran"}</Button>}
        {qrUrl && <div className="tv-qr"><QRCodeSVG value={qrUrl} size={200} level="M" marginSize={4} fgColor="var(--qr-foreground)" bgColor="var(--qr-background)" title="QR code de jumelage" /><p>Appairage par QR code</p></div>}
        {error && <p role="alert" className="tv-error">{error}</p>}
      </div>
      <footer className="tv-footer"><span>{online ? <Wifi /> : <WifiOff />}{online ? "Réseau disponible" : "Hors connexion"}</span><span>LECTEUR WEB · 0.1.0</span><Button variant="ghost" size="icon" aria-label="Plein écran" onClick={() => void enterPlayerMode()}><Maximize /></Button></footer>
    </div>}
    {phase === "playing" && source && controls && <div className="tv-controls"><span>{online ? <Wifi /> : <WifiOff />}{content?.playlist?.name} · {index + 1}/{items.length}{progress && ` · ${progress}`}</span><div><Button variant="ghost" size="icon" aria-label={paused ? "Lecture" : "Pause"} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}</Button><Button variant="ghost" size="icon" aria-label="Média suivant" onClick={() => setIndex((value) => nextItem(value, items.length))}><ChevronRight /></Button><Button variant="ghost" size="icon" aria-label="Synchroniser" disabled={busy.current || !identity || !online} onClick={() => { if (identity && !busy.current) { busy.current = true; void sync(identity).catch(() => setError("Synchronisation indisponible.")).finally(() => { busy.current = false; }); } }}><RefreshCw /></Button><Button variant="ghost" size="icon" aria-label="Plein écran" onClick={() => void enterPlayerMode()}><Maximize /></Button></div>{error && <p role="alert">{error}</p>}</div>}
    {phase === "playing" && source && !controls && <Button className="tv-menu" variant="ghost" size="icon" aria-label="Commandes de lecture" onClick={() => setControls(true)}><Settings2 /></Button>}
  </main>;
}