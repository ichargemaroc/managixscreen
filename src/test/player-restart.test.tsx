import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { TVPlayer } from "@/player/player";
import { saveCredentials, readCredentials } from "@/player/platform";
import { clearMediaCache, downloadContent } from "@/player/cache";
import type { Content, Credentials } from "@/player/protocol";

const native = vi.hoisted(() => ({ value: "", requests: vi.fn(), install: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, isPluginAvailable: () => true },
  registerPlugin: (name: string) => name === "ApkUpdater" ? { install: native.install } : ({
    ping: async () => {},
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
  native.requests.mockReset(); native.install.mockReset();
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

it("keeps the same pairing code and native identity after an APK update command and relaunch", async () => {
  const id = "a67f4500-b2f4-4049-9a31-5433f14aad57";
  const credentials: Credentials = { device_id: id, device_token: "a".repeat(64), pairing_code: "123456", expires_at: 1, paired: true };
  const content: Content = { screen_id: id, assignment_updated_at: "2026-11-24T00:00:00Z", last_sync_at: "2026-11-24T00:00:00Z", playlist: {
    id, name: "TV", updated_at: "2026-11-24T00:00:00Z", items: [{ id, position: 0, display_duration: 17,
      media: { id, name: "Contenu après mise à jour", type: "image", size: 4, duration: null, download_url: "https://example.test/image.png" } }],
  } };
  const payload = { url: "https://github.com/ichargemaroc/managixscreen/releases/download/player-3/screenflow-tv.apk", version_code: 3, version_name: "1.0.3", sha256: "b".repeat(64) };
  await saveCredentials(credentials);
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("data"));
  await downloadContent(content, () => {});
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  vi.stubGlobal("URL", class extends URL { static override createObjectURL() { return "blob:updated-player"; } static override revokeObjectURL() {} });
  native.install.mockResolvedValue({ status: "installer_opened" });
  native.requests.mockImplementation(async (operation: string) => {
    if (operation === "content") return content;
    if (operation === "commands") return { commands: native.install.mock.calls.length ? [] : [{ id, command: "update_apk", expires_at: "2099-01-01T00:00:00Z", payload }] };
    return {};
  });
  const previous = render(<TVPlayer />);
  await waitFor(() => expect(native.install).toHaveBeenCalledWith({ url: payload.url, versionCode: 3, sha256: payload.sha256 }));
  await waitFor(() => expect(screen.getByAltText("Contenu après mise à jour")).toHaveAttribute("src", "blob:updated-player"));
  previous.unmount();
  render(<TVPlayer />);
  await waitFor(() => expect(screen.getByAltText("Contenu après mise à jour")).toHaveAttribute("src", "blob:updated-player"));
  expect(await readCredentials()).toEqual(credentials);
  expect((await readCredentials())?.pairing_code).toBe("123456");
  expect(native.requests.mock.calls.some(([operation]) => operation === "request")).toBe(false);
});