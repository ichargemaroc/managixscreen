import { cleanup, render, act, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WebpageStage } from '@/player/webpage-stage';

vi.mock('@/player/webpage-native', () => ({ nativeWebpage: async () => null }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('ends a stalled page after fifteen seconds', async () => {
  vi.useFakeTimers(); const error = vi.fn(); const state = vi.fn();
  render(<WebpageStage url="https://example.com" name="Site" onError={error} onState={state} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(error).toHaveBeenCalledTimes(1); expect(state).toHaveBeenLastCalledWith('error');
});
it('refreshes only while active and returns to idle without retained frames', async () => {
  vi.useFakeTimers(); const error = vi.fn(); const state = vi.fn();
  const view = render(<WebpageStage url="https://example.com" name="Site" refreshMinutes={1} onError={error} onState={state} />);
  await act(async () => {});
  const initial = view.container.querySelector('iframe'); expect(initial).not.toBeNull();
  if (initial) fireEvent.load(initial);
  await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
  const replacement = view.container.querySelector('iframe'); expect(replacement).not.toBe(initial);
  if (replacement) fireEvent.load(replacement);
  view.rerender(<WebpageStage url="https://example.com" name="Site" active={false} refreshMinutes={1} onError={error} onState={state} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(120000); });
  expect(view.container.querySelector('iframe')).toBeNull(); expect(error).not.toHaveBeenCalled(); expect(state).toHaveBeenLastCalledWith('paused');
});