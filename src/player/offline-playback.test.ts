import { describe, expect, it } from 'vitest';
import { missingMediaAction, nextItem } from './protocol';

describe('diffusion hors connexion', () => {
  it('saute un média local manquant tant que toute la playlist n’a pas été essayée', () => {
    expect(missingMediaAction(1, 3)).toBe('skip');
    expect(missingMediaAction(2, 3)).toBe('skip');
  });

  it('arrête de chercher quand tous les médias de la playlist sont manquants', () => {
    expect(missingMediaAction(3, 3)).toBe('stop');
    expect(missingMediaAction(4, 3)).toBe('stop');
  });

  it('arrête immédiatement quand la playlist ne contient qu’un seul média manquant', () => {
    expect(missingMediaAction(1, 1)).toBe('stop');
  });

  it('gère une playlist vide sans boucler', () => {
    expect(missingMediaAction(1, 0)).toBe('stop');
    expect(nextItem(0, 0)).toBe(0);
  });

  it('le saut de média revient au début en fin de playlist', () => {
    expect(nextItem(2, 3)).toBe(0);
  });
});
