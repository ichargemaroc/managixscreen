import { describe, expect, it, vi } from 'vitest';
import { captureVideoThumbnail, videoThumbnailSize } from '@/lib/video-thumbnail';

describe('video thumbnails', () => {
  it('bounds landscape frames to 320×180 without distorting them', () => {
    expect(videoThumbnailSize(1920, 1080)).toEqual({ width: 320, height: 180 });
  });
  it('keeps portrait aspect ratio and does not upscale small sources', () => {
    expect(videoThumbnailSize(1080, 1920)).toEqual({ width: 101, height: 180 });
    expect(videoThumbnailSize(160, 90)).toEqual({ width: 160, height: 90 });
    expect(() => videoThumbnailSize(0, 0)).toThrow();
  });
  it('does not start a download for an aborted request', async () => {
    const create = vi.spyOn(document, 'createElement');
    const controller = new AbortController();
    controller.abort();
    await expect(captureVideoThumbnail('https://media.test/video.mp4', controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(create).not.toHaveBeenCalled();
    create.mockRestore();
  });
  it('captures a muted frame and releases the original video source', async () => {
    const video = document.createElement('video');
    Object.defineProperties(video, {
      videoWidth: { value: 1920 }, videoHeight: { value: 1080 }, duration: { value: 20 }, readyState: { value: 2 },
    });
    const load = vi.spyOn(video, 'load').mockImplementation(() => {});
    vi.spyOn(video, 'pause').mockImplementation(() => {});
    const canvas = document.createElement('canvas');
    const draw = vi.fn();
    vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage: draw } as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/jpeg;base64,frame');
    const original = document.createElement.bind(document);
    const create = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => tag === 'video' ? video : tag === 'canvas' ? canvas : original(tag));
    const result = captureVideoThumbnail('https://media.test/video.mp4', new AbortController().signal);
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    expect(video.muted).toBe(true);
    expect(video.preload).toBe('metadata');
    video.dispatchEvent(new Event('loadedmetadata'));
    expect(video.currentTime).toBe(1);
    video.dispatchEvent(new Event('seeked'));
    await expect(result).resolves.toBe('data:image/jpeg;base64,frame');
    expect(draw).toHaveBeenCalledWith(video, 0, 0, 320, 180);
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.55);
    expect(video.hasAttribute('src')).toBe(false);
    expect(load).toHaveBeenCalledTimes(2);
    create.mockRestore();
  });
});