// MyFinance — shared number / money formatting
// One source of truth so every view formats money the same way. Formatting follows the
// display language (locale() from i18n.js), so pt shows "1 234,50 €" where en shows "€1,234.50".

import { locale } from './i18n.js';

const cache = {};

function formatter(currency, decimals) {
  const loc = locale();
  const key = `${loc}:${currency}:${decimals}`;
  return (cache[key] ||= new Intl.NumberFormat(loc, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }));
}

// HTML-escape user-sourced strings before interpolating them into innerHTML / attributes
// (descriptions, names, tickers... anything typed by the user and stored in the DB).
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ESC[c]); }

// formatMoney(1234.5)            -> "€1,234.50"
// formatMoney(1234.5, 'USD')    -> "$1,234.50"
// formatMoney(24180, 'EUR', 0)  -> "€24,180"   (compact, for hero/KPI values)
export function formatMoney(amount, currency = 'EUR', decimals = 2) {
  return formatter(currency, decimals).format(Number(amount) || 0);
}

// Signed percentage: formatPct(2.4) -> "+2.4%" (pt: "+2,4%")
export function formatPct(value, digits = 1) {
  const loc = locale();
  const key = `pct:${loc}:${digits}`;
  const f = (cache[key] ||= new Intl.NumberFormat(loc, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: 'always',
  }));
  return f.format(Number(value) || 0) + '%';
}
