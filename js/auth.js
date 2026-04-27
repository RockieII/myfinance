// MyFinance — Authentication
// Simple email/password login via Supabase Auth.

import { getClient } from './db.js';

export function renderLogin(container, onSuccess) {
  container.innerHTML = `
    <div class="login-card card" style="max-width:360px;margin:60px auto;">
      <h2 style="margin:0 0 20px;font-size:20px;text-align:center;color:var(--accent)">MyFinance</h2>
      <form id="login-form">
        <div class="form-group">
          <label for="login-email">Email</label>
          <input id="login-email" type="email" class="form-control" required autocomplete="email">
        </div>
        <div class="form-group">
          <label for="login-password">Password</label>
          <input id="login-password" type="password" class="form-control" required autocomplete="current-password">
        </div>
        <div id="login-error" style="color:var(--danger);font-size:13px;margin-bottom:10px;display:none"></div>
        <button type="submit" class="btn btn-primary" style="width:100%">Sign In</button>
      </form>
    </div>
  `;

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const { error } = await getClient().auth.signInWithPassword({ email, password });
    if (error) {
      errorEl.textContent = error.message;
      errorEl.style.display = 'block';
    } else {
      onSuccess();
    }
  });
}

export async function getSession() {
  const { data } = await getClient().auth.getSession();
  return data.session;
}

export async function signOut() {
  await getClient().auth.signOut();
}
