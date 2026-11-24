import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), command: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ update: mocks.update }) } }));
vi.mock('@/lib/player.functions', () => ({ enqueueCommand: mocks.command }));
import { updateScreen } from '@/lib/store';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockResolvedValue({ error: null });
  mocks.command.mockResolvedValue(undefined);
});
it.each([0, 90, 180, 270] as const)('saves %i degrees to the selected screen and requests a refresh', async rotation => {
  await updateScreen('screen-a', { displayRotation: rotation });
  expect(mocks.update).toHaveBeenCalledWith({ display_rotation: rotation });
  expect(mocks.eq).toHaveBeenCalledWith('id', 'screen-a');
  expect(mocks.command).toHaveBeenCalledWith({ data: { screenId: 'screen-a', command: 'refresh_content' } });
});
it('does not issue a refresh if the screen write fails', async () => {
  mocks.eq.mockResolvedValue({ error: new Error('Access denied') });
  await expect(updateScreen('screen-a', { displayRotation: 90 })).rejects.toThrow('Access denied');
  expect(mocks.command).not.toHaveBeenCalled();
});
it('does not turn an optional refresh failure into a failed save', async () => {
  mocks.command.mockRejectedValue(new Error('Device offline'));
  await expect(updateScreen('screen-a', { displayRotation: 270 })).resolves.toBeUndefined();
  expect(mocks.update).toHaveBeenCalledWith({ display_rotation: 270 });
});