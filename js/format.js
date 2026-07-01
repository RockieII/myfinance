// MyFinance — shared number / money formatting
// One source of truth so every view formats money the same way.

const cache = {};

function formatter(currency, decimals) {
  const key = `${currency}:${decimals}`;
  return (cache[key] ||= new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }));
}

// formatMoney(1234.5)            -> "€1,234.50"
// formatMoney(1234.5, 'USD')    -> "$1,234.50"
// formatMoney(24180, 'EUR', 0)  -> "€24,180"   (compact, for hero/KPI values)
export function formatMoney(amount, currency = 'EUR', decimals = 2) {
  return formatter(currency, decimals).format(Number(amount) || 0);
}

// Signed percentage: formatPct(2.4) -> "+2.4%"
export function formatPct(value, digits = 1) {
  const n = Number(value) || 0;
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}
