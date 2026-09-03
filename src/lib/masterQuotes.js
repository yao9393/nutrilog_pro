import { supabase } from '../supabaseClient.js';

export const normalize = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
export const makeKey = (device, pkg, customer, serviceType) =>
  `${normalize(device)}|${normalize(pkg)}|${normalize(customer)}|${normalize(serviceType)}`;

function rowToRecord(row) {
  return {
    id: row.id,
    key: row.key,
    device: row.device,
    package: row.package || '',
    customer: row.customer,
    serviceType: row.service_type,
    supplier: row.supplier || '',
    charges: row.charges || [],
    totalCost: Number(row.total_cost) || 0,
    sellingPrice: Number(row.selling_price) || 0,
    marginPct: Number(row.margin_pct) || 0,
    markupPct: Number(row.markup_pct) || 0,
    currency: row.currency || 'USD',
    status: row.status || 'Active',
    lastQuotedDate: row.last_quoted_date,
    quoteRef: row.quote_ref || '',
    goldCategory: row.gold_category,
    description: row.description || '',
    serviceCoverage: row.service_coverage || '',
    specs: row.specs || {},
    notes: row.notes || '',
    source: row.source || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMasterQuotes() {
  const { data, error } = await supabase
    .from('master_quotes')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToRecord);
}

// Upsert by (user_id, key) — same "merge into existing device, or create new" behavior
// as the original commitQuotes(). Also writes one row per entry into quotation_log so
// Quote History keeps working the same way it did in the artifact version.
export async function upsertMasterQuotes(userId, entries) {
  const rows = entries.map((e) => ({
    user_id: userId,
    key: e.key,
    device: e.device,
    package: e.package || '',
    customer: e.customer,
    service_type: e.serviceType,
    supplier: e.supplier || '',
    charges: e.charges || [],
    total_cost: e.totalCost || 0,
    selling_price: e.sellingPrice || 0,
    margin_pct: e.marginPct || 0,
    markup_pct: e.markupPct || 0,
    currency: e.currency || 'USD',
    last_quoted_date: e.date || null,
    quote_ref: e.quoteRef || '',
    gold_category: e.goldCategory || null,
    description: e.description || '',
    service_coverage: e.serviceCoverage || '',
    specs: e.specs || {},
    notes: e.notes || '',
    source: e.source || '',
  }));
  const { error } = await supabase.from('master_quotes').upsert(rows, { onConflict: 'user_id,key' });
  if (error) throw error;

  const logRows = entries.map((e) => ({
    user_id: userId,
    key: e.key,
    device: e.device,
    package: e.package || '',
    customer: e.customer,
    service_type: e.serviceType,
    supplier: e.supplier || '',
    charges: e.charges || [],
    total_cost: e.totalCost || 0,
    selling_price: e.sellingPrice || 0,
    margin_pct: e.marginPct || 0,
    markup_pct: e.markupPct || 0,
    currency: e.currency || 'USD',
    date: e.date || new Date().toISOString().slice(0, 10),
    quote_ref: e.quoteRef || '',
    notes: e.notes || '',
  }));
  const { error: logError } = await supabase.from('quotation_log').insert(logRows);
  if (logError) throw logError;
}

// Partial update for inline edits (Price/Margin/Remark/Status in the table). Also logs
// a snapshot to quotation_log so every edit still shows up in Quote History.
export async function updateMasterQuote(userId, key, updates, fullRecordAfterUpdate) {
  const dbUpdates = {};
  if ('sellingPrice' in updates) dbUpdates.selling_price = updates.sellingPrice;
  if ('marginPct' in updates) dbUpdates.margin_pct = updates.marginPct;
  if ('markupPct' in updates) dbUpdates.markup_pct = updates.markupPct;
  if ('notes' in updates) dbUpdates.notes = updates.notes;
  if ('status' in updates) dbUpdates.status = updates.status;

  const { error } = await supabase.from('master_quotes').update(dbUpdates).eq('key', key);
  if (error) throw error;

  const r = fullRecordAfterUpdate;
  const { error: logError } = await supabase.from('quotation_log').insert([{
    user_id: userId, key: r.key, device: r.device, package: r.package, customer: r.customer,
    service_type: r.serviceType, supplier: r.supplier, charges: r.charges,
    total_cost: r.totalCost, selling_price: r.sellingPrice, margin_pct: r.marginPct, markup_pct: r.markupPct,
    currency: r.currency, date: new Date().toISOString().slice(0, 10), quote_ref: r.quoteRef, notes: r.notes,
  }]);
  if (logError) throw logError;
}

export async function deleteMasterQuote(key) {
  const { error } = await supabase.from('master_quotes').delete().eq('key', key);
  if (error) throw error;
}
