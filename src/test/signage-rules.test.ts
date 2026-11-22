import { describe, expect, it } from "vitest";
import { mediaKind, mediaMimeType, screenStatus } from "@/lib/signage-rules";

describe("Real signage data", () => {
  it("never shows a screen online without a heartbeat", () => {
    expect(screenStatus("online", null)).toBe("pending");
  });
  it("requires a recent heartbeat for online status", () => {
    const now = Date.parse("2026-11-20T03:00:00Z");
    expect(screenStatus("online", "2026-11-20T02:59:50Z", now)).toBe("online");
    expect(screenStatus("online", "2026-11-20T02:55:00Z", now)).toBe("offline");
  });
  it("supports MP4 video uploads", () => {
    expect(mediaKind("video/mp4")).toBe("video");
  });
  it("accepts MP4 when the file picker omits its type", () => {
    expect(mediaKind("", "Télévision.MP4")).toBe("video");
    expect(mediaMimeType("", "Télévision.MP4")).toBe("video/mp4");
  });
  it("accepts MP4 reported as a generic binary file", () => {
    expect(mediaKind("application/octet-stream", "clip.mp4")).toBe("video");
    expect(mediaMimeType("application/octet-stream", "clip.mp4")).toBe("video/mp4");
  });
  it("normalizes MIME case and codec parameters", () => {
    expect(mediaKind('VIDEO/MP4; codecs="avc1.42E01E"', "clip.mp4")).toBe("video");
    expect(mediaMimeType('VIDEO/MP4; codecs="avc1.42E01E"')).toBe("video/mp4");
  });
  it("does not disguise an explicitly incompatible type as MP4", () => {
    expect(mediaKind("application/pdf", "document.mp4")).toBeNull();
    expect(mediaKind("", "clip.mp4.exe")).toBeNull();
    expect(mediaKind("application/octet-stream", "clip.bin")).toBeNull();
  });
  it("supports images and rejects non-media uploads", () => {
    expect(mediaKind("image/png")).toBe("image");
    expect(mediaKind("application/pdf")).toBeNull();
  });
});