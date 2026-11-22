import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ upload: vi.fn(), insert: vi.fn(), getUser: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getUser: mocks.getUser },
  storage: { from: () => ({ upload: mocks.upload }) },
  from: () => ({ insert: mocks.insert }),
} }));
import { addMedia } from '@/lib/store';

describe('MP4 import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'owner' } } });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.insert.mockResolvedValue({ error: null });
  });
  it.each(['', 'application/octet-stream', 'video/mp4'])('uploads MP4 with video/mp4 content type when picker reports %s', async (type) => {
    const file = new File(['mp4 fixture'], 'Télévision.MP4', { type });
    await addMedia(file, 'video', 5);
    expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(/^owner\/[a-z0-9-]+\.mp4$/), file, { contentType: 'video/mp4' });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Télévision.MP4', type: 'video', duration: 5, size: file.size }));
  });
  it('rejects incompatible files before writing to storage', async () => {
    await expect(addMedia(new File(['pdf'], 'document.mp4', { type: 'application/pdf' }), 'video', null)).rejects.toThrow('Format de média non pris en charge');
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});