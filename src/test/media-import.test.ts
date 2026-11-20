import { describe, expect, it } from "vitest";
import { mediaStorageFilename } from "@/lib/signage-rules";

describe("media storage keys", () => {
  const id = "ce96c006-418a-469f-aacd-aba79c569952";
  it("accepts accented filenames without sending accents to storage", () => {
    expect(mediaStorageFilename("Été à Casablanca (test).png", id)).toBe(`${id}.png`);
  });
  it("handles Unicode video names and uppercase extensions", () => {
    expect(mediaStorageFilename("Télévision 🎬.MOV", id)).toBe(`${id}.mov`);
  });
  it("never uses path separators or unsafe extensions from filenames", () => {
    expect(mediaStorageFilename("photo.bad/é", id)).toBe(id);
  });
});