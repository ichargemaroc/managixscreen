import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { WebpageEvent } from '@/player/webpage-native';

let emit: (event: WebpageEvent) => void = () => {};
vi.mock('@/player/webpage-native', () => ({ nativeWebpage: async () => ({
  listen: async (callback: (event: WebpageEvent) => void) => { emit = callback; return { remove: async () => {} }; },
  open: async () => {}, close: async () => {}, reload: async () => {},
}) }));
afterEach(() => { cleanup(); });

it('reports the native DNS failure code and explains it on the TV', async () => {
  const { WebpageStage } = await import('@/player/webpage-stage');
  const opened = vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');
  const error = vi.fn();
  render(<WebpageStage url="https://example.com" name="Site" onError={error} onState={() => {}} />);
  await act(async () => {});
  await act(async () => { emit({ session: '00000000-0000-4000-8000-000000000001', state: 'error', code: 'net_-2' }); });
  expect(error).toHaveBeenCalledWith('net_-2');
  expect(screen.getByRole('alert').textContent).toContain('DNS');
  opened.mockRestore();
});
