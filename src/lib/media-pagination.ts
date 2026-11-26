export const MEDIA_PAGE_SIZE = 12;

export function mediaPage<T>(items: T[], requestedPage: number) {
  const pages = Math.max(1, Math.ceil(items.length / MEDIA_PAGE_SIZE));
  const page = Math.max(1, Math.min(pages, requestedPage));
  const start = (page - 1) * MEDIA_PAGE_SIZE;
  return { page, pages, start, items: items.slice(start, start + MEDIA_PAGE_SIZE) };
}