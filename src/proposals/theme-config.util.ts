/** Claves de tema permitidas (misma paleta que el editor frontend). */
export const THEME_CONFIG_KEYS = [
  'cootravirBlue',
  'cootravirBlueLight',
  'cootravirGold',
  'cootravirGoldLight',
  'backgroundDeep',
  'backgroundMid',
  'backgroundCard',
  'backgroundCardStrong',
  'backgroundHeader',
  'text',
  'textTitle',
  'textSubtitle',
  'textMuted',
  'textAccent',
  'iconColor',
  'iconAccent',
  'borderPanel',
  'borderAccent',
  'accentAnimation',
  'accentAnimationAlt',
  'accentGlow',
  'chartBarBlue',
  'chartBarMid',
  'chartBarGold',
] as const;

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

/** Normaliza y filtra theme_config antes de persistir en proposals.theme_config (JSON). */
export function normalizeThemeConfig(
  input: Record<string, unknown> | null | undefined,
): Record<string, string> | null {
  if (!input || typeof input !== 'object') return null;

  const out: Record<string, string> = {};
  for (const key of THEME_CONFIG_KEYS) {
    const raw = input[key];
    if (typeof raw !== 'string') continue;
    const value = raw.trim();
    if (!HEX_COLOR.test(value)) continue;
    out[key] = value;
  }

  return Object.keys(out).length > 0 ? out : null;
}
