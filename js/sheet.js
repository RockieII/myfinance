// MyFinance — modal / bottom-sheet helper
// Opens a form (or any markup) in a fixed overlay so it never pushes the page
// into a scroll. Used by the no-scroll core screens (transactions, stocks).

export function openSheet(innerHTML) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${innerHTML}</div>`;
  document.body.appendChild(backdrop);

  function close() {
    backdrop.classList.remove('show');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => backdrop.remove(), 180);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => backdrop.classList.add('show'));

  return { el: backdrop.querySelector('.sheet'), close };
}
