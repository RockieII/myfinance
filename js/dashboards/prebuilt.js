// MyFinance — Prebuilt page templates
// Ready-made dashboards the user can add from the page gallery. Layout items omit ids
// (assigned when instantiated). icon = Phosphor class used for the sidebar page item.

export const PREBUILT = [
  {
    id: 'overview', name: 'Overview', theme: 'default', icon: 'ph-chart-pie-slice',
    layout: [
      { type: 'net-worth', w: 4, h: 1 },
      { type: 'cash-flow', w: 4, h: 2 },
      { type: 'spending',  w: 4, h: 2 },
      { type: 'trend',     w: 4, h: 2 },
    ],
  },
  {
    id: 'spending', name: 'Spending focus', theme: 'ocean', icon: 'ph-shopping-cart',
    layout: [
      { type: 'cash-flow', w: 4, h: 2 },
      { type: 'spending',  w: 4, h: 3 },
      { type: 'savings',   w: 2, h: 1 },
      { type: 'accounts',  w: 2, h: 1 },
    ],
  },
  {
    id: 'wealth', name: 'Wealth', theme: 'indigo', icon: 'ph-bank',
    layout: [
      { type: 'net-worth', w: 4, h: 2 },
      { type: 'trend',     w: 4, h: 2 },
      { type: 'accounts',  w: 4, h: 2 },
    ],
  },
  {
    id: 'household', name: 'Household', theme: 'rose', icon: 'ph-users',
    layout: [
      { type: 'by-person-spending', w: 4, h: 2 },
      { type: 'by-person-net',      w: 4, h: 1 },
      { type: 'cash-flow',          w: 4, h: 2 },
    ],
  },
  {
    id: 'stocks', name: 'Stocks', theme: 'amber', icon: 'ph-trend-up',
    layout: [
      { type: 'portfolio',        w: 2, h: 1 },
      { type: 'cash-vs-invested', w: 2, h: 2 },
      { type: 'holdings',         w: 4, h: 2 },
      { type: 'stock-movers',     w: 4, h: 2 },
    ],
  },
  {
    id: 'habits', name: 'Subscriptions & habits', theme: 'ocean', icon: 'ph-repeat',
    layout: [
      { type: 'subscriptions',   w: 4, h: 2 },
      { type: 'top-merchants',   w: 4, h: 2 },
      { type: 'weekday-spend',   w: 2, h: 2 },
      { type: 'avg-daily-spend', w: 2, h: 2 },
    ],
  },
  {
    id: 'year', name: 'Year in review', theme: 'indigo', icon: 'ph-calendar-blank',
    layout: [
      { type: 'yearly-net',     w: 4, h: 2 },
      { type: 'month-compare',  w: 2, h: 2 },
      { type: 'category-donut', w: 2, h: 2 },
      { type: 'daily-spend',    w: 4, h: 2 },
    ],
  },
];
