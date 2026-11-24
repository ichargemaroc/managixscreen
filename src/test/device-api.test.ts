import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleDeviceRequest } from "@/lib/device-api.server";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), layout:vi.fn(),entitlement: vi.fn(), storage: { from: vi.fn() } }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { ...mocks, rpc: (name: string, args: unknown) => name === 'device_layout' ? mocks.layout(args) : name === 'device_entitlement' ? mocks.entitlement(args) : mocks.rpc(name, args) } }));

function row(data: unknown) {
  const query = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data }) };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.is.mockReturnValue(query);
  return query;
}

const deviceId = "a67f4500-b2f4-4049-9a31-5433f14aad57";
function request(token?: string, fields = {}) {
  return new Request("https://example.test/api/public/devices/status", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ device_id: deviceId, ...fields }) });
}

describe("Device API isolation", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.layout.mockResolvedValue({data:null});mocks.entitlement.mockResolvedValue({ data: { version: 1, active: true, revision: 1 } }); });
  it("rejects an anonymous device before reading any data", async () => {
    expect((await handleDeviceRequest(request(), "status")).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("never reads a session when device credentials do not match", async () => {
    mocks.from.mockReturnValue(row(null));
    expect((await handleDeviceRequest(request("a".repeat(64)), "status")).status).toBe(401);
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not send a heartbeat if the device has reached its limit", async () => {
    mocks.from.mockReturnValue(row({ device_id: deviceId }));
    mocks.rpc.mockResolvedValue({ data: false });
    expect((await handleDeviceRequest(request("a".repeat(64)), "heartbeat")).status).toBe(429);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("consume_device_limit", { p_key: `device:${deviceId}`, p_max: 30, p_seconds: 60 });
  });
  it("marks expired pending sessions expired without exposing owner information", async () => {
    mocks.from.mockReturnValueOnce(row({ device_id: deviceId })).mockReturnValueOnce(row({ status: "pending", expires_at: "2020-01-01T00:00:00Z", screen_id: null }));
    mocks.rpc.mockResolvedValue({ data: true });
    const response = await handleDeviceRequest(request("a".repeat(64)), "status");
    expect(await response.json()).toEqual({ status: "expired", expires_at: "2020-01-01T00:00:00Z", paired: false });
  });
  it.each(["content", "commands", "ack"] as const)("protects the %s endpoint from anonymous access", async (operation) => {
    const fields = operation === "ack" ? { command_id: deviceId, status: "completed" } : {};
    expect((await handleDeviceRequest(request(undefined, fields), operation)).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("records real device reports only through a token-scoped heartbeat RPC", async () => {
    mocks.from.mockReturnValue(row({ device_id: deviceId }));
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: "2026-11-20T00:00:00Z" });
    const response = await handleDeviceRequest(request("a".repeat(64), { player_version: "1.2.3", device_info: { model: "TV" }, playback_status: { state: "playing" } }), "heartbeat");
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith("device_report", { p_device: deviceId, p_hash: expect.stringMatching(/^[a-f0-9]{64}$/), p_report: { player_version: "1.2.3", device_info: { model: "TV" }, playback_status: { state: "playing" } } });
  });
  it("does not produce content URLs or synchronization when pairing authorization fails", async () => {
    mocks.from.mockReturnValue(row({ device_id: deviceId }));
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ error: { message: "Unauthorized" } });
    expect((await handleDeviceRequest(request("a".repeat(64)), "content")).status).toBe(401);
    expect(mocks.storage.from).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
  it("returns ordered media metadata and temporary URLs without exposing paths", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://storage.example.test");
    mocks.from.mockReturnValue(row({ device_id: deviceId }));
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: {
      screen_id: deviceId, assignment_updated_at: "2026-11-20T00:00:00Z",
      playlist: { id: deviceId, name: "Playlist", updated_at: "2026-11-20T00:01:00Z", items: [{ id: deviceId, position: 0, display_duration: 17, media: { id: deviceId, name: "Image", type: "image", size: 256, duration: null, path: "owner/file.png" } }] },
    } }).mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: "2026-11-20T00:02:00Z" });
    const sign = vi.fn().mockResolvedValue({ data: { signedUrl: "https://internal.test/storage/v1/object/sign/media/owner/file.png?token=test-only" } });
    mocks.storage.from.mockReturnValue({ createSignedUrl: sign });
    const response = await handleDeviceRequest(request("a".repeat(64)), "content");
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.playlist.items[0]).toMatchObject({ position: 0, display_duration: 17, media: { name: "Image", size: 256 } });
    expect(result.playlist.items[0].media.path).toBeUndefined();
    expect(result.playlist.items[0].media.download_url).toMatch(/^https:\/\/storage.example.test\//);
    expect(sign).toHaveBeenCalledWith("owner/file.png", 3600);
    expect(result.download_urls_expire_in).toBe(3600);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.rpc).toHaveBeenLastCalledWith("device_record_sync", { p_device: deviceId, p_hash: expect.any(String) });
    vi.unstubAllEnvs();
  });
  it("does not mark synchronization if signing a media URL fails", async () => {
    mocks.from.mockReturnValue(row({ device_id: deviceId }));
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: { screen_id: deviceId, assignment_updated_at: "now", playlist: { id: deviceId, name: "Playlist", updated_at: "now", items: [{ id: deviceId, position: 0, display_duration: 10, media: { id: deviceId, name: "Image", type: "image", size: 1, duration: null, path: "owner/file.png" } }] } } }).mockResolvedValueOnce({ data: null });
    mocks.storage.from.mockReturnValue({ createSignedUrl: vi.fn().mockResolvedValue({ error: { message: "Missing" } }) });
    expect((await handleDeviceRequest(request("a".repeat(64)), "content")).status).toBe(503);
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
  });
  it('delivers a webpage URL only to the paired device without storage signing or private paths', async () => {
    mocks.from.mockReturnValue(row({ device_id: deviceId }));
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: { screen_id: deviceId, assignment_updated_at: 'now', playlist: { id: deviceId, name: 'Site', updated_at: 'now', items: [{ id: deviceId, position: 0, display_duration: 45, media: { id: deviceId, name: 'Site', type: 'webpage', size: 0, duration: 45, path: 'owner/private.webpage', webpage_url: 'https://example.com/page', refresh_minutes: 2, webpage_fullscreen: true } }] } } }).mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: 'now' });
    const response = await handleDeviceRequest(request('a'.repeat(64)), 'content');
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.playlist.items[0].media.webpage_url).toBe('https://example.com/page');
    expect(result.playlist.items[0].media.path).toBeUndefined();
    expect(result.playlist.items[0].media.download_url).toBeUndefined();
    expect(mocks.storage.from).not.toHaveBeenCalled();
  });
  it("scopes acknowledgements to the authenticated device and rejects invalid transitions", async () => {
    mocks.from.mockReturnValue(row({ device_id: deviceId }));
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: false });
    expect((await handleDeviceRequest(request("a".repeat(64), { command_id: deviceId, status: "completed" }), "ack")).status).toBe(409);
    expect(mocks.rpc).toHaveBeenLastCalledWith("device_ack_command", { p_device: deviceId, p_hash: expect.any(String), p_command: deviceId, p_status: "completed" });
  });
  it("does not treat command polling as playback or a heartbeat", async () => {
    mocks.from.mockReturnValue(row({ device_id: deviceId }));
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: [{ id: deviceId, command: "restart_player" }] });
    const response = await handleDeviceRequest(request("a".repeat(64)), "commands");
    expect(await response.json()).toEqual({ commands: [{ id: deviceId, command: "restart_player" }], server_time: expect.any(String) });
    expect(mocks.rpc).toHaveBeenLastCalledWith("device_poll_commands", { p_device: deviceId, p_hash: expect.any(String) });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
  it('does not sign or sync disabled screen content and keeps identity valid', async () => {
    mocks.from.mockReturnValue(row({ device_id: deviceId }));
    mocks.entitlement.mockResolvedValue({ data: { version: 1, active: false, revision: 2 } });
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: { screen_id: deviceId, assignment_updated_at: 'now', playlist: null } });
    const response = await handleDeviceRequest(request('a'.repeat(64)), 'content');
    expect(response.status).toBe(200);
    expect((await response.json()).entitlement.active).toBe(false);
    expect(mocks.storage.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalledWith('device_record_sync', expect.anything());
    expect(mocks.entitlement).toHaveBeenCalledWith({ p_device: deviceId, p_hash: expect.stringMatching(/^[a-f0-9]{64}$/) });
  });
  it('fails closed on unavailable entitlements without revoking the identity', async () => {
    mocks.from.mockReturnValue(row({ device_id: deviceId }));
    mocks.rpc.mockResolvedValue({ data: true });
    mocks.entitlement.mockResolvedValue({ error: { message: 'Unavailable' } });
    expect((await handleDeviceRequest(request('a'.repeat(64)), 'content')).status).toBe(503);
    expect(mocks.storage.from).not.toHaveBeenCalled();
  });
});
describe("Device API access from the Android app", () => {
  it("answers the Android WebView preflight without cookies", async () => {
    const { deviceCorsPreflight } = await import("@/lib/device-api.server");
    const response = deviceCorsPreflight();
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-headers")).toContain("Authorization");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  });
});

describe('Display rotation synchronization', () => {
  it('delivers rotation-only changes and changes the fingerprint without signing media', async () => {
    vi.resetAllMocks();
    mocks.from.mockReturnValue(row({ device_id: deviceId }));
    mocks.layout.mockResolvedValue({ data: null });
    mocks.entitlement.mockResolvedValue({ data: { version: 1, active: true, revision: 1 } });
    let rotation = 90;
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === 'consume_device_limit') return { data: true };
      if (name === 'device_content') return { data: { screen_id: deviceId, assignment_updated_at: 'now', display_rotation: rotation, playlist: null } };
      if (name === 'device_record_sync') return { data: 'now' };
      return { data: null };
    });
    const first = await (await handleDeviceRequest(request('a'.repeat(64)), 'content')).json();
    expect(first.display_rotation).toBe(90);
    const unchanged = await (await handleDeviceRequest(request('a'.repeat(64), { known: first.fingerprint }), 'content')).json();
    expect(unchanged.unchanged).toBe(true);
    rotation = 270;
    const next = await (await handleDeviceRequest(request('a'.repeat(64), { known: first.fingerprint }), 'content')).json();
    expect(next.unchanged).toBeUndefined();
    expect(next.display_rotation).toBe(270);
    expect(next.fingerprint).not.toBe(first.fingerprint);
    expect(mocks.storage.from).not.toHaveBeenCalled();
  });
});

describe("Video wall device manifests", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.layout.mockResolvedValue({data:null});mocks.entitlement.mockResolvedValue({ data: { version: 1, active: true, revision: 1 } }); });
  it("overrides a standard playlist with only the device wall and strips private fields", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://storage.example.test");
    mocks.from.mockReturnValue(row({ device_id: deviceId }));
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: { screen_id: deviceId, assignment_updated_at: "now", playlist: null } }).mockResolvedValueOnce({ data: {
      id: deviceId, user_id: "private-owner", name: "Wall", columns: 2, rows: 2, width: 3840, height: 2160, gap_x: 0, gap_y: 0, orientation: "landscape", row_index: 1, column_index: 0, state: "playing", epoch: "2026-11-21T14:00:00Z", position_seconds: 0, revision: 1,
      media: { id: deviceId, name: "Wall image", type: "image", size: 256, duration: null, path: "owner/wall.png" },
    } }).mockResolvedValueOnce({ data: "2026-11-21T14:00:00Z" });
    mocks.storage.from.mockReturnValue({ createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://internal.test/storage/v1/object/sign/media/owner/wall.png?token=test-only" } }) });
    const response = await handleDeviceRequest(request("a".repeat(64)), "content");
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.wall).toMatchObject({ row_index: 1, column_index: 0, columns: 2, rows: 2 });
    expect(result.wall.user_id).toBeUndefined();
    expect(result.wall.media).toBeUndefined();
    expect(result.playlist.items).toHaveLength(1);
    expect(result.playlist.items[0].media.name).toBe("Wall image");
    expect(result.playlist.items[0].media.path).toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledWith("device_wall", { p_device: deviceId, p_hash: expect.any(String) });
    vi.unstubAllEnvs();
  });
  it("fails closed when wall authorization cannot be revalidated", async () => {
    mocks.from.mockReturnValue(row({ device_id: deviceId }));
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: { screen_id: deviceId, assignment_updated_at: "now", playlist: null } }).mockResolvedValueOnce({ error: { message: "Unauthorized" } });
    expect((await handleDeviceRequest(request("a".repeat(64)), "content")).status).toBe(503);
    expect(mocks.storage.from).not.toHaveBeenCalled();
  });
});
