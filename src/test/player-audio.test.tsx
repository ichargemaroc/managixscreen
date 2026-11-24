import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TVPlayer } from '@/player/player';
import { WallStage } from '@/player/wall-stage';
import type { Content } from '@/player/protocol';
import type { WallPlayback } from '@/lib/video-wall';

const fixture = vi.hoisted(() => ({ content: null as Content | null }));
vi.mock('@/player/platform', () => ({
  readCredentials: async () => ({ device_id: 'a67f4500-b2f4-4049-9a31-5433f14aad57', device_token: 'a'.repeat(64), paired: true }),
  saveCredentials: vi.fn(), subscribeNetwork: async () => () => {}, keepAwake: async () => () => {}, enterPlayerMode: vi.fn(),
}));
vi.mock('@/player/cache', () => ({ readContent: async () => fixture.content, cachedMedia: async () => new Blob(['video']), cachedMusic: async () => new Blob(['ID3music']), commandReceipt: vi.fn(), saveReceipt: vi.fn(), downloadContent: vi.fn(), clearMediaCache: vi.fn() }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function setupPlaylist() {
  const id = 'a67f4500-b2f4-4049-9a31-5433f14aad57';
  fixture.content = { screen_id: id, assignment_updated_at: '2026-11-21T19:45:00Z', last_sync_at: '2026-11-21T19:45:00Z', playlist: { id, name: 'Vidéo avec son', updated_at: '2026-11-21T19:45:00Z', items: [{ id, position: 0, display_duration: 10, media: { id, name: 'Vidéo', type: 'video', size: 5, duration: 10, download_url: 'https://example.test/video.mp4' } }] } };
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  vi.stubGlobal('URL', class extends URL { static override createObjectURL() { return 'blob:audio-video'; } static override revokeObjectURL() {} });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
}

it('plays playlist videos with audio enabled', async () => {
  setupPlaylist();
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const { container } = render(<TVPlayer />);
  await waitFor(() => expect(play).toHaveBeenCalled());
  const video = container.querySelector('video');
  expect(video?.muted).toBe(false);
  expect(video?.defaultMuted).toBe(false);
  expect(video?.volume).toBe(1);
});

it('does not interrupt background music while changing image sources', async () => {
  setupPlaylist();
  const previous = fixture.content; const first = previous?.playlist?.items[0];
  if (!previous?.playlist || !first) throw new Error('Missing fixture');
  const image = { ...first, media: { ...first.media, type: 'image' as const } };
  fixture.content = { ...previous, playlist: { ...previous.playlist, items: [image, { ...image, id: 'b67f4500-b2f4-4049-9a31-5433f14aad57' }] }, background_music: { id: first.id, name: 'Ambiance', size: 12, enabled: true, volume: 35, pause_on_video: true, download_url: 'https://example.test/music.mp3' } };
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const { container } = render(<TVPlayer />);
  await waitFor(() => expect(container.querySelector('audio')?.volume).toBe(0.35));
  const audio = container.querySelector('audio');
  fireEvent.click(await screen.findByRole('button', { name: 'Commandes de lecture' }));
  const pause = vi.mocked(HTMLMediaElement.prototype.pause); pause.mockClear();
  fireEvent.click(await screen.findByRole('button', { name: 'Média suivant' }));
  await waitFor(() => expect(container.textContent).toContain('2/2'));
  expect(container.querySelector('audio')).toBe(audio);
  expect(pause).not.toHaveBeenCalled();
});

it('retries audible playback directly from the play button after browser autoplay denial', async () => {
  setupPlaylist();
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValueOnce(new DOMException('User gesture required', 'NotAllowedError')).mockResolvedValue();
  render(<TVPlayer />);
  await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
  fireEvent.click(await screen.findByRole('button', { name: 'Lecture' }));
  await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
});

const wall: WallPlayback = { id: 'a67f4500-b2f4-4049-9a31-5433f14aad57', name: 'Mur', rows: 1, columns: 2, width: 1920, height: 1080, gap_x: 0, gap_y: 0, orientation: 'landscape', row_index: 0, column_index: 0, state: 'playing', epoch: '2026-11-21T00:00:00Z', position_seconds: 0, revision: 1 };

it('keeps video-wall audio enabled and retries a blocked start on explicit confirmation', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValueOnce(new DOMException('User gesture required', 'NotAllowedError')).mockResolvedValue();
  const { container } = render(<WallStage wall={wall} source="blob:audio-video" type="video" clockOffset={0} onState={() => {}} />);
  expect(container.querySelector('video')?.muted).toBe(false);
  fireEvent.click(await screen.findByRole('button', { name: 'Lecture avec son' }));
  await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
});