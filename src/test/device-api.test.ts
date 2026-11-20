import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleDeviceRequest } from "@/lib/device-api.server";

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: mocks }));

function row(data: unknown) {
  const query = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data }) };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.is.mockReturnValue(query);
  return query;
}

const deviceId = "a67f4500-b2f4-4049-9a31-5433f14aad57";
function request(token?: string) {
  return new Request("https://example.test/api/public/devices/status", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ device_id: deviceId }) });
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
});