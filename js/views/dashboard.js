// MyFinance — Dashboard View
// KPI cards + Chart.js charts for financial overview.

import * as DB from '../db.js';

let chartInstances = [];

export async function renderDashboard(container) {
  // Destroy previous charts
  chartInstances.forEach(c => c.destroy());
  chartInstances = [];

  const [transactions, accounts, stocks, prices] = await Promise.all([
    DB.getTransactionsWithDetails(),
    DB.getAll('accounts'),
    DB.getAll('stocks'),
    DB.getStockPrices(),
  ]);

  const priceMap = {};
  prices.forEach(p => { priceMap[p.ticker] = p.price; });

  // Calculate KPIs
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  const monthTx = transactions.filter(t => t.date.startsWith(currentMonth));
  const prevMonthTx = transactions.filter(t => t.date.startsWith(prevMonth));

  const monthIncome = sumByType(monthTx, 'income');
  const monthExpense = sumByType(monthTx, 'expense');
  const prevIncome = sumByType(prevMonthTx, 'income');
  const prevExpense = sumByType(prevMonthTx, 'expense');

  // Account balances = initial_balance + income - expenses for each account
  const accountBalances = accounts.map(acc => {
    const accTx = transactions.filter(t => t.account_id === acc.id);
    const income = sumByType(accTx, 'income');
    const expense = sumByType(accTx, 'expense');
    return { ...acc, balance: acc.initial_balance + income - expense };
  });
  const totalBalance = accountBalances.reduce((s, a) => s + a.balance, 0);

  // Portfolio value
  const portfolioValue = stocks.reduce((s, st) => {
    const price = priceMap[st.ticker] || st.purchase_price;
    return s + st.quantity * price;
  }, 0);

  const netWorth = totalBalance + portfolioValue;
  const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome * 100) : 0;
  const prevSavingsRate = prevIncome > 0 ? ((prevIncome - prevExpense) / prevIncome * 100) : 0;

  container.innerHTML = `
    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="fs-12 text-dim">Net Worth</div>
        <div class="fs-20 fw-600">${fmt(netWorth)}</div>
      </div>
      <div class="kpi-card">
        <div class="fs-12 text-dim">Total Balance</div>
        <div class="fs-20 fw-600">${fmt(totalBalance)}</div>
      </div>
      <div class="kpi-card">
        <div class="fs-12 text-dim">This Month Income</div>
        <div class="fs-20 fw-600 text-ok">${fmt(monthIncome)}</div>
      </div>
      <div class="kpi-card">
        <div class="fs-12 text-dim">This Month Expenses</div>
        <div class="fs-20 fw-600 text-danger">${fmt(monthExpense)}</div>
      </div>
      <div class="kpi-card">
        <div class="fs-12 text-dim">Portfolio Value</div>
        <div class="fs-20 fw-600">${fmt(portfolioValue)}</div>
      </div>
      <div class="kpi-card">
        <div class="fs-12 text-dim">Savings Rate</div>
        <div class="fs-20 fw-600 ${savingsRate >= 0 ? 'text-ok' : 'text-danger'}">${savingsRate.toFixed(0)}%</div>
        <div class="fs-12 text-dim">${trendArrow(savingsRate, prevSavingsRate)} vs last month</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="chart-section">
      <h3 class="section-title">Monthly Income vs Expenses</h3>
      <div class="card"><canvas id="chart-monthly"></canvas></div>
    </div>

    <div class="chart-section">
      <h3 class="section-title">Expense Breakdown (This Month)</h3>
      <div class="card" style="max-width:400px;margin:0 auto"><canvas id="chart-categories"></canvas></div>
    </div>

    <div class="chart-section">
      <h3 class="section-title">Net Worth Over Time</h3>
      <div class="card"><canvas id="chart-networth"></canvas></div>
    </div>
  `;

  // Render charts after DOM is ready
  setTimeout(() => {
    initMonthlyChart(transactions);
    initCategoryChart(monthTx);
    initNetWorthChart(transactions, accounts, stocks, priceMap);
  }, 0);
}

function initMonthlyChart(transactions) {
  const months = getLast12Months();
  const incomeData = months.map(m => sumByType(transactions.filter(t => t.date.startsWith(m)), 'income'));
  const expenseData = months.map(m => sumByType(transactions.filter(t => t.date.startsWith(m)), 'expense'));

  const ctx = document.getElementById('chart-monthly');
  if (!ctx) return;
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months.map(formatMonthLabel),
      datasets: [
        { label: 'Income', data: incomeData, backgroundColor: '#5bd89a', borderRadius: 4 },
        { label: 'Expenses', data: expenseData, backgroundColor: '#ff5a7a', borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#8b97b3' } } },
      scales: {
        x: { ticks: { color: '#8b97b3' }, grid: { color: '#3a3a5c33' } },
        y: { ticks: { color: '#8b97b3' }, grid: { color: '#3a3a5c33' } },
      },
    },
  });
  chartInstances.push(chart);
}

function initCategoryChart(monthTx) {
  const expenses = monthTx.filter(t => t.type === 'expense');
  const byCategory = {};
  expenses.forEach(t => {
    const name = t.categories?.name || 'Other';
    byCategory[name] = (byCategory[name] || 0) + parseFloat(t.amount);
  });

  const labels = Object.keys(byCategory);
  const data = Object.values(byCategory);
  const colors = [
    '#5C6BC0', '#ff5a7a', '#5bd89a', '#ffcc33', '#14b8a6',
    '#f97316', '#a855f7', '#ec4899', '#6366f1', '#84cc16',
  ];

  const ctx = document.getElementById('chart-categories');
  if (!ctx) return;
  if (!labels.length) {
    ctx.parentElement.innerHTML = '<div class="empty">No expenses this month.</div>';
    return;
  }
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: '#8b97b3', padding: 12 } } },
    },
  });
  chartInstances.push(chart);
}

function initNetWorthChart(transactions, accounts, stocks, priceMap) {
  const months = getLast12Months();
  const initialTotal = accounts.reduce((s, a) => s + parseFloat(a.initial_balance), 0);
  const portfolioValue = stocks.reduce((s, st) => {
    const price = priceMap[st.ticker] || st.purchase_price;
    return s + st.quantity * price;
  }, 0);

  // Cumulative balance up to each month
  const netWorthData = months.map(m => {
    const txUpToMonth = transactions.filter(t => t.date.slice(0, 7) <= m);
    const income = sumByType(txUpToMonth, 'income');
    const expense = sumByType(txUpToMonth, 'expense');
    return initialTotal + income - expense + portfolioValue;
  });

  const ctx = document.getElementById('chart-networth');
  if (!ctx) return;
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months.map(formatMonthLabel),
      datasets: [{
        label: 'Net Worth',
        data: netWorthData,
        borderColor: '#5C6BC0',
        backgroundColor: '#5C6BC020',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#5C6BC0',
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#8b97b3' } } },
      scales: {
        x: { ticks: { color: '#8b97b3' }, grid: { color: '#3a3a5c33' } },
        y: { ticks: { color: '#8b97b3' }, grid: { color: '#3a3a5c33' } },
      },
    },
  });
  chartInstances.push(chart);
}

// Helpers

function sumByType(txs, type) {
  return txs.filter(t => t.type === type).reduce((s, t) => s + parseFloat(t.amount), 0);
}

function getLast12Months() {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

function formatMonthLabel(ym) {
  const [y, m] = ym.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[parseInt(m) - 1]} ${y.slice(2)}`;
}

function trendArrow(current, previous) {
  if (current > previous) return '<span class="text-ok">&#9650;</span>';
  if (current < previous) return '<span class="text-danger">&#9660;</span>';
  return '<span class="text-dim">&#9654;</span>';
}

function fmt(amount) {
  return new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR' }).format(amount);
}
