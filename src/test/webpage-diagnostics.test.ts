import { expect, it } from 'vitest';
import { reportedWebpageFailure, webpageFailureCode, webpageFailureLabel } from '@/lib/webpage-diagnostics';

it('keeps only allow-listed failure codes', () => {
  expect(webpageFailureCode('net_-2')).toBe('net_-2');
  expect(webpageFailureCode('WEBPAGE_INVALID_URL')).toBe('webpage_invalid_url');
  expect(webpageFailureCode('java.lang.Exception: secret token abc')).toBe('open_failed');
});
it('explains DNS failures in French', () => {
  expect(webpageFailureLabel('net_-2')).toContain('DNS');
  expect(reportedWebpageFailure({ state: 'playing', error: 'webpage:http_404' })).toContain('404');
  expect(reportedWebpageFailure({ state: 'playing', error: 'autre' })).toBeNull();
});
