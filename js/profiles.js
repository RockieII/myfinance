// MyFinance — Profiles
// One account can hold several people (e.g. a couple). Profiles are pure ATTRIBUTION:
// each transaction may belong to a profile, which lets "Multiple" widgets break spending
// down per person. Profiles are NOT a global view filter — accounts/categories/stocks are shared.

import * as DB from './db.js';

let profiles = [];

export async function loadProfiles() {
  profiles = await DB.getAll('profiles', { order: 'name', ascending: true });
  return profiles;
}

export function getProfiles() { return profiles; }
export function hasProfiles() { return profiles.length > 0; }
export function getProfile(id) { return profiles.find(p => p.id === id) || null; }
