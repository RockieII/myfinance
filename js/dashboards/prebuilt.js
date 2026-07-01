// MyFinance — Prebuilt page templates
// Ready-made dashboards the user can add. Layout items omit ids (assigned when instantiated).

export const PREBUILT = [
  {
    id: 'overview', name: 'Overview', theme: 'default',
    layout: [
      { type: 'net-worth', w: 4, h: 1 },
      { type: 'cash-flow', w: 4, h: 1 },
      { type: 'spending',  w: 4, h: 2 },
      { type: 'trend',     w: 4, h: 2 },
    ],
  },
  {
    id: 'spending', name: 'Spending focus', theme: 'ocean',
    layout: [
      { type: 'cash-flow', w: 4, h: 1 },
      { type: 'spending',  w: 4, h: 3 },
      { type: 'savings',   w: 2, h: 1 },
      { type: 'accounts',  w: 2, h: 1 },
    ],
  },
  {
    id: 'wealth', name: 'Wealth', theme: 'indigo',
    layout: [
      { type: 'net-worth', w: 4, h: 2 },
      { type: 'trend',     w: 4, h: 2 },
      { type: 'accounts',  w: 4, h: 2 },
    ],
  },
  {
    id: 'household', name: 'Household', theme: 'rose',
    layout: [
      { type: 'by-person-spending', w: 4, h: 2 },
      { type: 'by-person-net',      w: 4, h: 1 },
      { type: 'cash-flow',          w: 4, h: 1 },
    ],
  },
];
