import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BackgroundMusic } from '@/player/background-music';
import type { Content } from '@/player/protocol';

const mocks = vi.hoisted(() => ({ cached: vi.fn() }));
vi.mock('@/player/cache', () => ({ cachedMusic: mocks.cached }));
const id = 'a67f4500-b2f4-4049-9a31-5433f14aad57';
const content: Content = { screen_id: id, assignment_updated_at: 'now', last_sync_at: 'now', playlist: null, background_music: { id, name: 'Ambiance', size: 12, download_url: 'https://example.test/music.mp3', enabled: true, volume: 35, pause_on_video: true } };
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function setup() {
  mocks.cached.mockResolvedValue(new Blob(['ID3music']));
  vi.stubGlobal('URL', class extends URL { static override createObjectURL() { return 'blob:music'; } static override revokeObjectURL() {} });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
}
it('loops at the saved volume and preserves the audio element across slide refreshes', async () => {
  setup(); const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const { container, rerender } = render(<BackgroundMusic content={content} active videoPlaying={false} />);
  await waitFor(() => expect(play).toHaveBeenCalled());
  const audio = container.querySelector('audio');
  expect(audio?.loop).toBe(true); expect(audio?.volume).toBe(0.35);
  rerender(<BackgroundMusic content={{ ...content, last_sync_at: 'later' }} active videoPlaying={false} />);
  expect(container.querySelector('audio')).toBe(audio);
  rerender(<BackgroundMusic content={content} active videoPlaying />);
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  rerender(<BackgroundMusic content={content} active videoPlaying={false} />);
  await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
});
it('allows a gesture to resume sound after autoplay denial', async () => {
  setup(); const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValueOnce(new DOMException('Gesture required', 'NotAllowedError')).mockResolvedValue();
  render(<BackgroundMusic content={content} active videoPlaying={false} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Activer la musique' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Activer la musique' })).toBeNull());
  expect(play).toHaveBeenCalledTimes(2);
});