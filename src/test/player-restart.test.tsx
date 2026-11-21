import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { TVPlayer } from "@/player/player";
import { saveCredentials, readCredentials } from "@/player/platform";
import { clearMediaCache, downloadContent } from "@/player/cache";
import type { Content, Credentials } from "@/player/protocol";

const native = vi.hoisted(() => ({ value: "", requests: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, isPluginAvailable: () => true },
  registerPlugin: () => ({
    read: async () => ({ value: native.value }),
    write: async ({ value }: { value: string }) => { native.value = value; },
    clear: async () => { native.value = ""; },
  }),
}));
vi.mock("@capacitor/network", () => ({ Network: {
  addListener: async () => ({ remove: async () => {} }),
  getStatus: async () => ({ connected: false }),
} }));
vi.mock("@/player/protocol", async (original) => ({
  ...await original<typeof import("@/player/protocol")>(),
  deviceApi: native.requests,
}));

afterEach(async () => {
  cleanup(); await clearMediaCache(); await saveCredentials(null); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

it("resumes a paired native identity and downloaded playlist after reopening without requesting a code", async () => {
  const id = "a67f4500-b2f4-4049-9a31-5433f14aad57";
  const credentials: Credentials = { device_id: id, device_token: "a".repeat(64), pairing_code: "123456", expires_at: 1, paired: true };
  const content: Content = { screen_id: id, assignment_updated_at: "2026-11-21T00:00:00Z", last_sync_at: "2026-11-21T00:00:00Z", playlist: {
    id, name: "TV", updated_at: "2026-11-21T00:00:00Z", items: [{ id, position: 0, display_duration: 17,
      media: { id, name: "Playlist conservée", type: "image", size: 4, duration: null, download_url: "https://example.test/image.png" } }],
  } };
  await saveCredentials(credentials);
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("data"));
  await downloadContent(content, () => {});
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  vi.stubGlobal("URL", class extends URL { static override createObjectURL() { return "blob:offline-playlist"; } static override revokeObjectURL() {} });
  native.requests.mockClear();
  const first = render(<TVPlayer />);
  await waitFor(() => expect(screen.getByAltText("Playlist conservée")).toHaveAttribute("src", "blob:offline-playlist"));
  first.unmount();
  render(<TVPlayer />);
  await waitFor(() => expect(screen.getByAltText("Playlist conservée")).toHaveAttribute("src", "blob:offline-playlist"));
  expect(await readCredentials()).toEqual(credentials);
  expect(screen.queryByRole("button", { name: "Connecter cet écran" })).toBeNull();
  expect(native.requests).not.toHaveBeenCalled();
});