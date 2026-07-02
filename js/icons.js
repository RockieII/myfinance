// MyFinance — shared icon set + picker markup (Phosphor icons)
// Used for page/folder icons in the sidebar and anywhere an icon picker is needed.

export const ICONS = [
  'ph-squares-four', 'ph-chart-pie-slice', 'ph-chart-line', 'ph-chart-bar', 'ph-gauge',
  'ph-wallet', 'ph-bank', 'ph-piggy-bank', 'ph-coins', 'ph-credit-card', 'ph-currency-circle-dollar',
  'ph-house', 'ph-fork-knife', 'ph-car', 'ph-airplane', 'ph-heart', 'ph-graduation-cap',
  'ph-shopping-bag', 'ph-gift', 'ph-briefcase', 'ph-calendar', 'ph-star', 'ph-tag',
  'ph-folder', 'ph-user', 'ph-users', 'ph-target', 'ph-lightning', 'ph-globe', 'ph-trend-up',
];

// Returns an icon-grid of selectable buttons (class "icon-pick", data-icon="ph-...").
export function iconPickerHTML(selected) {
  return `<div class="icon-grid">${ICONS.map(ic =>
    `<button type="button" class="icon-pick ${ic === selected ? 'active' : ''}" data-icon="${ic}"><i class="ph ${ic}"></i></button>`
  ).join('')}</div>`;
}

// Wire the .icon-pick buttons inside `root` (single-select). Returns a getter for the chosen icon.
export function bindIconPicker(root, initial) {
  let selected = initial;
  root.querySelectorAll('.icon-pick').forEach(b => b.addEventListener('click', () => {
    root.querySelectorAll('.icon-pick').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    selected = b.dataset.icon;
  }));
  return () => selected;
}
