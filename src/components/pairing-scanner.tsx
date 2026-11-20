import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scannedPairingCode } from "@/lib/qr-pairing";

export function PairingScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [ready, setReady] = useState(false);
  const accept = useRef(onCode);
  accept.current = onCode;

  useEffect(() => {
    let disposed = false;
    let scanner: { destroy: () => void } | undefined;
    let detected = false;
    void (async () => {
      try {
        const { default: QrScanner } = await import("qr-scanner");
        if (disposed || !video.current) return;
        const instance = new QrScanner(video.current, (result) => {
          if (disposed || detected) return;
          const code = scannedPairingCode(result.data);
          if (!code) { setError("Ce QR code n’est pas un code de jumelage TV."); return; }
          detected = true;
          instance.stop();
          accept.current(code);
        }, { preferredCamera: "environment", returnDetailedScanResult: true, maxScansPerSecond: 5 });
        scanner = instance;
        await instance.start();
        if (disposed) instance.destroy();
        else setReady(true);
      } catch {
        if (!disposed) setError("Caméra indisponible. Autorisez son accès dans votre navigateur, ou choisissez une photo du QR code.");
      }
    })();
    return () => { disposed = true; scanner?.destroy(); };
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
        <video ref={video} muted playsInline className="size-full object-cover" aria-label="Caméra de scan QR" />
        {!ready && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground"><Camera className="size-10" /></div>}
        <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-primary" />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <input ref={fileInput} type="file" accept="image/*" aria-label="Photo du QR code" className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setReading(true); setError("");
        try {
          const { default: QrScanner } = await import("qr-scanner");
          const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
          const code = scannedPairingCode(result.data);
          if (!code) throw new Error("invalid");
          onCode(code);
        } catch { setError("Aucun QR code de jumelage valide trouvé dans cette photo."); }
        finally { setReading(false); }
      }} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={reading} onClick={() => fileInput.current?.click()}><ImagePlus />{reading ? "Lecture…" : "Choisir une photo"}</Button>
        <Button type="button" variant="ghost" onClick={onClose}><X /> Fermer la caméra</Button>
      </div>
    </div>
  );
}