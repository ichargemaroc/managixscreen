// Browser-only work is performed on demand, never while importing during SSR.
// Serialize frame extraction to avoid opening many video downloads at once.
let pending: Promise<unknown> = Promise.resolve();

export function videoThumbnailSize(width: number, height: number) {
  if (width <= 0 || height <= 0) throw new Error('Dimensions vidéo invalides');
  const scale = Math.min(1, 480 / width, 270 / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function captureVideoThumbnail(url: string, signal: AbortSignal): Promise<string> {
  const task = pending.catch(() => {}).then(() => extractFrame(url, signal));
  pending = task.catch(() => {});
  return task;
}

function extractFrame(url: string, signal: AbortSignal): Promise<string> {
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    let settled = false;
    let seekComplete = false;
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      video.onloadedmetadata = null;
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const abort = () => fail(new DOMException('Aborted', 'AbortError'));
    const timer = setTimeout(() => fail(new Error('Aperçu vidéo indisponible')), 12_000);
    const draw = () => {
      if (settled || !seekComplete || video.readyState < 2) return;
      try {
        const size = videoThumbnailSize(video.videoWidth, video.videoHeight);
        const canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Aperçu vidéo indisponible');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = canvas.toDataURL('image/jpeg', 0.7);
        settled = true;
        cleanup();
        resolve(image);
      } catch { fail(new Error('Aperçu vidéo indisponible')); }
    };
    signal.addEventListener('abort', abort, { once: true });
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const time = Number.isFinite(video.duration) && video.duration > 0 ? Math.min(1, video.duration / 4) : 0;
      if (time > 0) video.currentTime = time;
      else { seekComplete = true; draw(); }
    };
    video.onseeked = () => { seekComplete = true; draw(); };
    video.onloadeddata = draw;
    video.onerror = () => fail(new Error('Aperçu vidéo indisponible'));
    video.src = url;
    video.load();
  });
}