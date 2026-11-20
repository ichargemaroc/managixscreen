import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleDeviceRequest } from "@/lib/device-api.server";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: mocks }));

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
  beforeEach(() => vi.resetAllMocks());
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
    } }).mockResolvedValueOnce({ data: "2026-11-20T00:02:00Z" });
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
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: { screen_id: deviceId, assignment_updated_at: "now", playlist: { id: deviceId, name: "Playlist", updated_at: "now", items: [{ id: deviceId, position: 0, display_duration: 10, media: { id: deviceId, name: "Image", type: "image", size: 1, duration: null, path: "owner/file.png" } }] } } });
    mocks.storage.from.mockReturnValue({ createSignedUrl: vi.fn().mockResolvedValue({ error: { message: "Missing" } }) });
    expect((await handleDeviceRequest(request("a".repeat(64)), "content")).status).toBe(503);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
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
    expect(await response.json()).toEqual({ commands: [{ id: deviceId, command: "restart_player" }] });
    expect(mocks.rpc).toHaveBeenLastCalledWith("device_poll_commands", { p_device: deviceId, p_hash: expect.any(String) });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
});