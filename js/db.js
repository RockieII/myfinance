// MyFinance — Supabase CRUD wrapper
// Provides a uniform async API for all database operations.

let supabase = null;

export function initDB(client) {
  supabase = client;
}

export function getClient() {
  return supabase;
}

export async function getAll(table, { filters = {}, order = 'created_at', ascending = false, select = '*' } = {}) {
  let query = supabase.from(table).select(select);
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query.order(order, { ascending });
  if (error) throw error;
  return data;
}

export async function getById(table, id) {
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function create(table, record) {
  const user = (await supabase.auth.getUser()).data.user;
  const row = { ...record, user_id: user.id };
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function update(table, id, changes) {
  const { data, error } = await supabase
    .from(table)
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function remove(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

// Upsert for stock price cache (keyed by ticker, no user_id)
export async function upsertStockPrice(ticker, price, changePct) {
  const { error } = await supabase.from('stock_prices').upsert({
    ticker,
    price,
    change_pct: changePct,
    fetched_at: new Date().toISOString(),
  }, { onConflict: 'ticker' });
  if (error) throw error;
}

export async function getStockPrices() {
  const { data, error } = await supabase.from('stock_prices').select('*');
  if (error) throw error;
  return data || [];
}

// Get transactions with joined category and account names
export async function getTransactionsWithDetails(filters = {}) {
  let query = supabase
    .from('transactions')
    .select('*, categories(name, icon, type), accounts(name)');
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw error;
  return data;
}
