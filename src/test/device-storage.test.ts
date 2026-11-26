import { describe, expect, it, vi, afterEach } from 'vitest';
import { formatStorageBytes, parseStorageReport } from '@/lib/device-storage';
import { deviceReport } from '@/lib/player-protocol';
const mocks = vi.hoisted(() => ({ native: false, available: true, read: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native, isPluginAvailable: () => mocks.available }, registerPlugin: () => ({ read: mocks.read }) }));
import { readDeviceStorage } from '@/player/device-storage';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); mocks.native = false; mocks.available = true; });

describe('TV storage readings', () => {
  const report = { storage_total_bytes: 8 * 1024 ** 3, storage_available_bytes: 2 * 1024 ** 3, storage_source: 'device' as const };
  it('reports total and available capacity without confusing them', async () => {
    mocks.native = true; mocks.read.mockResolvedValue(report);
    expect(await readDeviceStorage()).toEqual(report);
    expect(formatStorageBytes(report.storage_total_bytes)).toBe('8 Go');
    expect(formatStorageBytes(report.storage_available_bytes)).toBe('2 Go');
    expect(deviceReport.safeParse({ device_id: 'a67f4500-b2f4-4049-9a31-5433f14aad57', device_info: report }).success).toBe(true);
  });
  it('keeps missing and impossible readings unavailable', async () => {
    expect(parseStorageReport({})).toBeNull();
    expect(parseStorageReport({ ...report, storage_available_bytes: -1 })).toBeNull();
    expect(parseStorageReport({ ...report, storage_available_bytes: 9 * 1024 ** 3 })).toBeNull();
    mocks.native = true; mocks.available = false;
    expect(await readDeviceStorage()).toBeNull();
  });
  it('labels browser quotas instead of claiming physical capacity', async () => {
    vi.stubGlobal('navigator', { storage: { estimate: async () => ({ quota: 1000, usage: 250 }) } });
    expect(await readDeviceStorage()).toEqual({ storage_total_bytes: 1000, storage_available_bytes: 750, storage_source: 'browser' });
  });
  it('stops waiting for a stalled bridge so synchronization continues', async () => {
    vi.useFakeTimers(); mocks.native = true; mocks.read.mockImplementation(() => new Promise(() => {}));
    const result = readDeviceStorage();
    await vi.advanceTimersByTimeAsync(1500);
    expect(await result).toBeNull();
  });
});