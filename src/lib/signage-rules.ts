export function screenStatus(status: string, lastSeen: string | null, now = Date.now()): "online" | "offline" | "pending" {
  if (!lastSeen) return "pending";
  const seen = Date.parse(lastSeen);
  return status === "online" && Number.isFinite(seen) && seen <= now && now - seen < 120_000 ? "online" : "offline";
}

export function mediaKind(mime: string): "image" | "video" | null {
  if (mime.startsWith("image/")) return "image";
  if (["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/ogg"].includes(mime)) return "video";
  return null;
}

// Keep user filenames in media.name, never in the storage object key.
export function mediaStorageFilename(filename: string, id: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]{1,10}$/.test(extension) && filename.includes(".")
    ? `${id}.${extension}`
    : id;
}