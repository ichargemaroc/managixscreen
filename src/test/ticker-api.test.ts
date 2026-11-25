import { describe, expect, it } from 'vitest';
import { bearerToken, tickerApiBody } from '@/lib/ticker-api';

describe('API du bandeau', () => {
  it('refuse une clé absente ou mal formée', () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken('Bearer abc')).toBeNull();
    expect(bearerToken(`Bearer ${'a'.repeat(64)}`)).toBe('a'.repeat(64));
  });
  it('refuse un texte de plus de 500 caractères', () => {
    expect(tickerApiBody.safeParse({ text: 'x'.repeat(501) }).success).toBe(false);
    expect(tickerApiBody.safeParse({ text: 'Promo', enabled: true }).success).toBe(true);
  });
});
