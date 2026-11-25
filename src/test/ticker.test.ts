import { describe, expect, it } from 'vitest';
import { tickerBackground, parseTicker, tickerVisible, DEFAULT_TICKER } from '@/lib/ticker';

describe('bandeau défilant', () => {
  it('accepte le mode « une seule fois » avec un temps de passage de 45 s', () => {
    expect(parseTicker({ enabled: true, text: 'Promo', mode: 'once', seconds: 45 })).toEqual({ ...DEFAULT_TICKER, enabled: true, text: 'Promo', mode: 'once', seconds: 45 });
  });
  it('revient aux réglages par défaut si les données sont invalides', () => {
    expect(parseTicker({ enabled: true, text: 'x', mode: 'bounce', seconds: 2 })).toEqual(DEFAULT_TICKER);
    expect(parseTicker(null)).toEqual(DEFAULT_TICKER);
  });
  it('ne s’affiche pas sans texte ou désactivé', () => {
    expect(tickerVisible({ ...DEFAULT_TICKER, enabled: true, text: '  ', mode: 'loop', seconds: 30 })).toBe(false);
    expect(tickerVisible({ ...DEFAULT_TICKER, enabled: false, text: 'Bonjour', mode: 'loop', seconds: 30 })).toBe(false);
    expect(tickerVisible({ ...DEFAULT_TICKER, enabled: true, text: 'Bonjour', mode: 'loop', seconds: 30 })).toBe(true);
  });
});

describe('apparence du bandeau', () => {
  it('garde les anciens bandeaux lisibles avec les valeurs par défaut', () => {
    const t = parseTicker({ enabled: true, text: 'A', mode: 'loop', seconds: 30 });
    expect(t.height).toBe(7);
    expect(t.opacity).toBe(75);
  });
  it('applique l’opacité choisie à la couleur du fond', () => {
    expect(tickerBackground({ ...DEFAULT_TICKER, background: '#ff0000', opacity: 50 })).toBe('#ff000080');
  });
});
