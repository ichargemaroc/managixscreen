import { QueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: mocks.getUser } } }));
import { verifiedUser, cacheVerifiedSignIn } from '@/lib/verified-user';

describe('Verified navigation identity', () => {
  beforeEach(() => { vi.useRealTimers(); mocks.getUser.mockReset(); });

  it('reuses a successful sign-in response without a second verification call', async () => {
    const client = new QueryClient();
    const user = { id: 'signed-in-owner' } as User;
    await cacheVerifiedSignIn(client, user);
    expect(await verifiedUser(client)).toEqual(user);
    expect(mocks.getUser).not.toHaveBeenCalled();
    client.clear();
  });

  it('revalidates a primed sign-in identity after 30 seconds', async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    await cacheVerifiedSignIn(client, { id: 'signed-in-owner' } as User);
    vi.advanceTimersByTime(30_001);
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await verifiedUser(client)).toBeNull();
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('shares one server verification across consecutive page changes', async () => {
    const client = new QueryClient();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
    expect(await verifiedUser(client)).toEqual({ id: 'owner' });
    expect(await verifiedUser(client)).toEqual({ id: 'owner' });
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('revalidates after the bounded freshness period', async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
    await verifiedUser(client);
    vi.advanceTimersByTime(30_001);
    await verifiedUser(client);
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('does not restore private access after sign-out clears the cache', async () => {
    const client = new QueryClient();
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'owner' } }, error: null });
    await verifiedUser(client);
    client.clear();
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect(await verifiedUser(client)).toBeNull();
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it('fails closed when verification fails after invalidation', async () => {
    const client = new QueryClient();
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'owner' } }, error: null });
    await verifiedUser(client);
    await client.invalidateQueries();
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('verification failed') });
    await expect(verifiedUser(client)).rejects.toThrow('verification failed');
    client.clear();
  });
});