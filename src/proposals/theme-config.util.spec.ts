import { normalizeThemeConfig } from './theme-config.util';

describe('normalizeThemeConfig', () => {
  it('guarda solo claves válidas con color hex', () => {
    const out = normalizeThemeConfig({
      cootravirBlue: '#0e2455',
      textTitle: '#ffffff',
      evil: 'red',
      cootravirGold: 'not-a-color',
    });
    expect(out).toEqual({
      cootravirBlue: '#0e2455',
      textTitle: '#ffffff',
    });
  });

  it('devuelve null si no hay colores válidos', () => {
    expect(normalizeThemeConfig({})).toBeNull();
    expect(normalizeThemeConfig(null)).toBeNull();
  });
});
