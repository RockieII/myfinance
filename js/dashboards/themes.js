// MyFinance — Page themes
// A theme is a preset of colour (+ optional font) applied to a whole dashboard page:
// it sets the page's accent (charts, highlights) and font-family. Stored per page in dashboards.theme.

export const THEMES = {
  default: { name: 'Default', accent: '#1E7F5C', font: '' },
  indigo:  { name: 'Indigo',  accent: '#6366F1', font: '' },
  ocean:   { name: 'Ocean',   accent: '#0EA5E9', font: '' },
  amber:   { name: 'Amber',   accent: '#D97706', font: '' },
  rose:    { name: 'Rose',    accent: '#E11D48', font: '' },
  serif:   { name: 'Serif',   accent: '#7C3AED', font: 'Georgia, "Times New Roman", serif' },
};

export function getTheme(id) { return THEMES[id] || THEMES.default; }
