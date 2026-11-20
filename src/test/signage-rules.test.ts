import { describe, expect, it } from "vitest";
import { mediaKind, screenStatus } from "@/lib/signage-rules";

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
  it("supports images and rejects non-media uploads", () => {
    expect(mediaKind("image/png")).toBe("image");
    expect(mediaKind("application/pdf")).toBeNull();
  });
});