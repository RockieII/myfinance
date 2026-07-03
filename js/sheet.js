// MyFinance — modal / bottom-sheet helper
// Opens a form (or any markup) in a fixed overlay so it never pushes the page
// into a scroll. Used by the no-scroll core screens (transactions, stocks).
// opts.wide    — adds .sheet-wide (desktop-wide sheet, styled in css/library.css).
// opts.onClose — called exactly once when the sheet closes. Every close path (a caller's
//                Close button, backdrop click, Escape) funnels through the single close()
//                below, so onClose is a reliable cleanup hook (e.g. destroying charts).

export function openSheet(innerHTML, opts = {}) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `<div class="sheet${opts.wide ? ' sheet-wide' : ''}" role="dialog" aria-modal="true">${innerHTML}</div>`;
  document.body.appendChild(backdrop);

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    backdrop.classList.remove('show');
    document.removeEventListener('keydown', onKey);
    try { opts.onClose?.(); } catch (_) { /* cleanup must never block closing */ }
    setTimeout(() => backdrop.remove(), 180);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => backdrop.classList.add('show'));

  return { el: backdrop.querySelector('.sheet'), close };
}
