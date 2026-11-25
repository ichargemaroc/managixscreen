import { describe, expect, it } from 'vitest';
import { parseTicker, tickerVisible, DEFAULT_TICKER } from '@/lib/ticker';

describe('bandeau défilant', () => {
  it('accepte le mode « une seule fois » avec un temps de passage de 45 s', () => {
    expect(parseTicker({ enabled: true, text: 'Promo', mode: 'once', seconds: 45 })).toEqual({ enabled: true, text: 'Promo', mode: 'once', seconds: 45 });
  });
  it('revient aux réglages par défaut si les données sont invalides', () => {
    expect(parseTicker({ enabled: true, text: 'x', mode: 'bounce', seconds: 2 })).toEqual(DEFAULT_TICKER);
    expect(parseTicker(null)).toEqual(DEFAULT_TICKER);
  });
  it('ne s’affiche pas sans texte ou désactivé', () => {
    expect(tickerVisible({ enabled: true, text: '  ', mode: 'loop', seconds: 30 })).toBe(false);
    expect(tickerVisible({ enabled: false, text: 'Bonjour', mode: 'loop', seconds: 30 })).toBe(false);
    expect(tickerVisible({ enabled: true, text: 'Bonjour', mode: 'loop', seconds: 30 })).toBe(true);
  });
});
