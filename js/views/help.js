// MyFinance — Help / FAQ
// Plain-language guide for non-technical users. Static content (scrollable view).
// Every string (including the HTML-carrying answers) is a t() key so the whole page translates.

import { t } from '../i18n.js';

export async function renderHelp(container) {
  container.innerHTML = `
    <button class="btn btn-outline btn-sm mb-12" id="help-back">‹ ${t('Settings')}</button>

    <h3 class="section-title">${t('Getting started')}</h3>
    <div class="card">
      <p>${t('<strong>MyFinance</strong> tracks your money in one place — what comes in, what goes out, your accounts, and your investments — and shows it back to you as simple dashboards.')}</p>
      <p class="text-dim fs-12" style="margin-bottom:0">${t('Your data is private to your account and stored securely.')}</p>
    </div>

    <h3 class="section-title">${t('How do I…')}</h3>
    <div class="card">
      ${faq(t('Add income or an expense?'), t('Open <strong>Transactions</strong> → <strong>+ Add</strong>. Pick a type, amount, category, account and date. It appears instantly in your lists and dashboard.'))}
      ${faq(t('Create an account?'), t('Open <strong>Data → Accounts → + Add Account</strong> (e.g. a checking account, savings, or cash). Every transaction belongs to one account.'))}
      ${faq(t('Change my categories?'), t('Go to <strong>Settings → Categories</strong>. You can add your own, pick an <strong>icon and colour</strong>, and delete custom ones. The colour is used across your charts.'))}
      ${faq(t('Track a stock?'), t('Open <strong>Stocks → + Add Holding</strong>. Enter the ticker (e.g. AAPL), how many shares, and your average buy price. Tap <strong>Refresh</strong> to update prices.'))}
      ${faq(t('Fill the app with test data?'), t('Settings → <strong>Developer → Generate test data</strong> creates realistic sample data tagged <em>[TEST]</em>. <strong>Wipe test data</strong> removes only that — your real records are never touched.'))}
    </div>

    <h3 class="section-title">${t('Good to know')}</h3>
    <div class="card">
      ${faq(t('Live stock prices'), t('Prices come from a market data service. Without a key configured, holdings still show but current prices may be blank.'))}
      ${faq(t('Everything fits one screen'), t('Pages are designed not to scroll — long lists page through with the <strong>◂ Prev / Next ▸</strong> buttons instead.'))}
      ${faq(t('Is my data safe?'), t('Each account only ever sees its own data. Nothing is shared with other users.'))}
    </div>

    <div class="card">
      <p class="text-dim fs-12" style="margin:0">${t('More features (shared profiles for couples, customizable dashboards) are on the way.')}</p>
    </div>
  `;

  container.querySelector('#help-back').addEventListener('click', () => { location.hash = 'settings'; });
}

function faq(q, a) {
  return `
    <div class="row" style="display:block;padding:12px 0">
      <div class="fw-600" style="margin-bottom:2px">${q}</div>
      <div class="fs-12 text-dim" style="line-height:1.5">${a}</div>
    </div>
  `;
}
