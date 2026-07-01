// MyFinance — Profiles
// One account can hold several people (e.g. a couple). Profiles are attribution tags;
// accounts/categories/stocks stay shared. The "active profile" scopes what the app shows
// (persisted locally). '' = All (combined household view).

import * as DB from './db.js';

const KEY = 'myfinance.activeProfile';
let profiles = [];

export async function loadProfiles() {
  profiles = await DB.getAll('profiles', { order: 'name', ascending: true });
  // If the stored active profile no longer exists, reset to All.
  const active = getActiveProfile();
  if (active && !profiles.some(p => p.id === active)) setActiveProfile('');
  return profiles;
}

export function getProfiles() { return profiles; }
export function hasProfiles() { return profiles.length > 0; }

export function getActiveProfile() { return localStorage.getItem(KEY) || ''; }   // '' = All
export function setActiveProfile(id) {
  if (id) localStorage.setItem(KEY, id);
  else localStorage.removeItem(KEY);
}
export function activeProfileName() {
  const id = getActiveProfile();
  return profiles.find(p => p.id === id)?.name || 'All';
}

// Scope a transactions array to the active profile.
// All → everything; a specific profile → only that profile's rows (shared/NULL show only under All).
export function scopeToActiveProfile(transactions) {
  const id = getActiveProfile();
  return id ? transactions.filter(t => t.profile_id === id) : transactions;
}
