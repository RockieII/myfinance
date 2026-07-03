// MyFinance — Page themes
// A theme is a preset of colour (+ optional font) applied to a whole dashboard page:
// it sets the page's accent (charts, highlights) and font-family. Stored per page in dashboards.theme.
// Fonts are system stacks only — no webfont loading.

export const THEMES = {
  default: { name: 'Default', accent: '#1E7F5C', font: '' },
  indigo:  { name: 'Indigo',  accent: '#6366F1', font: '' },
  ocean:   { name: 'Ocean',   accent: '#0EA5E9', font: '' },
  amber:   { name: 'Amber',   accent: '#D97706', font: '' },
  rose:    { name: 'Rose',    accent: '#E11D48', font: '' },
  serif:   { name: 'Serif',   accent: '#7C3AED', font: 'Georgia, "Times New Roman", serif' },
  violet:  { name: 'Violet',  accent: '#8B5CF6', font: '' },
  teal:    { name: 'Teal',    accent: '#0D9488', font: '' },
  sky:     { name: 'Sky',     accent: '#3B82F6', font: '' },
  forest:  { name: 'Forest',  accent: '#166534', font: '' },
  sunset:  { name: 'Sunset',  accent: '#EA580C', font: '' },
  crimson: { name: 'Crimson', accent: '#B91C1C', font: '' },
  berry:   { name: 'Berry',   accent: '#A21CAF', font: '' },
  gold:    { name: 'Gold',    accent: '#A16207', font: '' },
  slate:   { name: 'Slate',   accent: '#475569', font: '' },
  mono:    { name: 'Mono',    accent: '#18181B', font: 'ui-monospace, "Cascadia Mono", Consolas, "Courier New", monospace' },
};

// Page props every resolved theme carries; a stored value missing any of these gets the
// default, so old stored ids/JSON keep working unchanged.
export const DEFAULT_PROPS = { font: '', bg: 'none', radius: 'default', shadow: 'soft', density: 'cozy', hideTitles: false };

export function getTheme(id) { return THEMES[id] || THEMES.default; }

// Resolve what's stored in dashboards.theme (text column) into full theme props.
// Stored value is either a preset id ('indigo') or a JSON object string for custom themes
// ('{"base":"indigo","accent":"#123456",...}') — old clients fall back to default harmlessly.
// The result ALWAYS includes: accent, font, bg, radius, shadow, density, hideTitles.
export function resolveTheme(field) {
  if (typeof field === 'string' && field.startsWith('{')) {
    try {
      const o = JSON.parse(field);
      return { ...DEFAULT_PROPS, ...(THEMES[o.base] || THEMES.default), ...o };
    } catch (_) { /* fall through */ }
  }
  return { ...DEFAULT_PROPS, ...getTheme(field) };
}
