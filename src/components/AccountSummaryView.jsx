import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { listMasterQuotes, upsertMasterQuotes, updateMasterQuote, deleteMasterQuote, makeKey } from '../lib/masterQuotes.js';

const SERVICE_TYPES = ['Assembly', 'Final Test', 'Full Turnkey', 'General / Equipment', 'Material Recert (MRB)'];
const STATUS_OPTIONS = ['Active', 'Under Review', 'Obsolete'];
const STATUS_COLORS = { Active: '#0E7C74', 'Under Review': '#C98A2C', Obsolete: '#B1552C' };

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Same click-to-edit pattern as the original artifact: shows plain text until focused,
// commits on blur/Enter, ignores no-op edits.
function EditableCell({ value, onCommit, type = 'text', prefix, suffix, decimals, placeholder, minWidth = 90 }) {
  const [editing, setEditing] = useState(false);
  const displayValue = type === 'number' ? Number(value || 0).toFixed(decimals ?? 4) : (value || '');
  const [draft, setDraft] = useState(displayValue);

  useEffect(() => { if (!editing) setDraft(displayValue); }, [value, editing]); // eslint-disable-line

  const commit = () => {
    setEditing(false);
    if (type === 'number') {
      const num = parseFloat(draft);
      if (!isNaN(num) && num !== parseFloat(value || 0)) onCommit(num);
      else setDraft(displayValue);
    } else {
      const trimmed = draft.trim();
      if (trimmed !== (value || '')) onCommit(trimmed);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {prefix && <span style={{ fontSize: 12, color: '#6B7280' }}>{prefix}</span>}
      <input
        value={editing ? draft : displayValue}
        onFocus={() => setEditing(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
        placeholder={placeholder}
        style={{ minWidth, width: '100%', border: 'none', borderBottom: editing ? '1px solid #0E7C74' : '1px solid transparent', background: 'transparent', fontSize: 13, padding: '2px 0', fontFamily: type === 'number' ? 'monospace' : 'inherit' }}
      />
      {suffix && <span style={{ fontSize: 12, color: '#6B7280' }}>{suffix}</span>}
    </div>
  );
}

function AddDeviceForm({ userId, onAdded, onCancel }) {
  const [form, setForm] = useState({
    device: '', package: '', customer: '', serviceType: 'Assembly', supplier: '',
    totalCost: '', sellingPrice: '', currency: 'USD', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const cost = parseFloat(form.totalCost) || 0;
  const price = parseFloat(form.sellingPrice) || 0;
  const marginPct = price > 0 ? ((price - cost) / price) * 100 : 0;
  const markupPct = cost > 0 ? ((price - cost) / cost) * 100 : 0;

  const handleSubmit = async () => {
    if (!form.device.trim() || !form.customer.trim() || price <= 0) {
      setError('Device, Customer, and Selling Price are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const entry = {
        key: makeKey(form.device, form.package, form.customer, form.serviceType),
        device: form.device.trim(), package: form.package.trim(), customer: form.customer.trim(),
        serviceType: form.serviceType, supplier: form.supplier.trim(),
        charges: [{ label: 'Cost', amount: cost }],
        totalCost: cost, sellingPrice: price,
        marginPct: Number(marginPct.toFixed(2)), markupPct: Number(markupPct.toFixed(2)),
        currency: form.currency, date: new Date().toISOString().slice(0, 10),
        notes: form.notes.trim(), source: 'web-add',
      };
      await upsertMasterQuotes(userId, [entry]);
      onAdded();
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '7px 9px', border: '1px solid #E5E3DC', borderRadius: 6, fontSize: 13 };
  const labelStyle = { fontSize: 11, fontWeight: 500, color: '#6B7280', display: 'block', marginBottom: 3 };

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E3DC', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Add Device</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <label><span style={labelStyle}>Device *</span><input value={form.device} onChange={set('device')} style={inputStyle} /></label>
        <label><span style={labelStyle}>Package</span><input value={form.package} onChange={set('package')} style={inputStyle} /></label>
        <label><span style={labelStyle}>Customer *</span><input value={form.customer} onChange={set('customer')} style={inputStyle} /></label>
        <label><span style={labelStyle}>Service Type</span>
          <select value={form.serviceType} onChange={set('serviceType')} style={inputStyle}>
            {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label><span style={labelStyle}>Supplier</span><input value={form.supplier} onChange={set('supplier')} style={inputStyle} /></label>
        <label><span style={labelStyle}>Currency</span>
          <select value={form.currency} onChange={set('currency')} style={inputStyle}>
            <option value="USD">USD</option><option value="MYR">MYR</option><option value="SGD">SGD</option><option value="CNY">CNY</option>
          </select>
        </label>
        <label><span style={labelStyle}>Total Cost</span><input type="number" step="0.0001" value={form.totalCost} onChange={set('totalCost')} style={{ ...inputStyle, fontFamily: 'monospace' }} /></label>
        <label><span style={labelStyle}>Selling Price *</span><input type="number" step="0.0001" value={form.sellingPrice} onChange={set('sellingPrice')} style={{ ...inputStyle, fontFamily: 'monospace' }} /></label>
        <label><span style={labelStyle}>Notes</span><input value={form.notes} onChange={set('notes')} style={inputStyle} /></label>
      </div>
      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10, fontFamily: 'monospace' }}>
        Margin {marginPct.toFixed(1)}% · Markup {markupPct.toFixed(1)}%
      </div>
      {error && <div style={{ fontSize: 12, color: '#B1552C', background: '#F5E6DC', padding: '6px 10px', borderRadius: 6, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#0E7C74', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Save Device'}
        </button>
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'transparent', color: '#6B7280', fontSize: 13, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AccountSummaryView({ userId }) {
  const [master, setMaster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setMaster(await listMasterQuotes());
    } catch (err) {
      setError(err.message || 'Could not load devices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const customers = useMemo(() => [...new Set(master.map((m) => m.customer))].filter(Boolean).sort(), [master]);

  const filtered = useMemo(() => master.filter((m) => {
    if (search && !`${m.device} ${m.package}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (customerFilter && m.customer !== customerFilter) return false;
    if (statusFilter && m.status !== statusFilter) return false;
    return true;
  }), [master, search, customerFilter, statusFilter]);

  // Cost stays fixed as the anchor for both directions, same as the original: editing
  // Price recomputes Margin% against the existing cost, editing Margin% recomputes Price.
  const commitPriceEdit = async (m, newPrice) => {
    const cost = m.totalCost || 0;
    const marginPct = newPrice > 0 ? Number((((newPrice - cost) / newPrice) * 100).toFixed(2)) : 0;
    const markupPct = cost > 0 ? Number((((newPrice - cost) / cost) * 100).toFixed(2)) : 0;
    const updates = { sellingPrice: Number(newPrice.toFixed(4)), marginPct, markupPct };
    const next = master.map((x) => (x.key === m.key ? { ...x, ...updates } : x));
    setMaster(next);
    try {
      await updateMasterQuote(userId, m.key, updates, { ...m, ...updates });
    } catch (err) {
      setError(err.message); load();
    }
  };

  const commitMarginEdit = async (m, newMarginPct) => {
    const cost = m.totalCost || 0;
    if (cost <= 0 || newMarginPct >= 100) return;
    const sellingPrice = Number((cost / (1 - newMarginPct / 100)).toFixed(4));
    const markupPct = Number((((sellingPrice - cost) / cost) * 100).toFixed(2));
    const updates = { sellingPrice, marginPct: Number(newMarginPct.toFixed(2)), markupPct };
    const next = master.map((x) => (x.key === m.key ? { ...x, ...updates } : x));
    setMaster(next);
    try {
      await updateMasterQuote(userId, m.key, updates, { ...m, ...updates });
    } catch (err) {
      setError(err.message); load();
    }
  };

  const commitRemarkEdit = async (m, newRemark) => {
    const updates = { notes: newRemark };
    const next = master.map((x) => (x.key === m.key ? { ...x, ...updates } : x));
    setMaster(next);
    try {
      await updateMasterQuote(userId, m.key, updates, { ...m, ...updates });
    } catch (err) {
      setError(err.message); load();
    }
  };

  const commitStatusChange = async (m, newStatus) => {
    const updates = { status: newStatus };
    const next = master.map((x) => (x.key === m.key ? { ...x, ...updates } : x));
    setMaster(next);
    try {
      await updateMasterQuote(userId, m.key, updates, { ...m, ...updates });
    } catch (err) {
      setError(err.message); load();
    }
  };

  const handleDelete = async (key) => {
    if (!window.confirm('Remove this device from the master list? This cannot be undone.')) return;
    try {
      await deleteMasterQuote(key);
      setMaster((prev) => prev.filter((m) => m.key !== key));
    } catch (err) {
      setError(err.message);
    }
  };

  const inputStyle = { padding: '7px 9px', border: '1px solid #E5E3DC', borderRadius: 6, fontSize: 13 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Account Summary View</div>
        <button onClick={() => setShowAdd((s) => !s)} style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: '#0E7C74', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {showAdd ? 'Close' : '+ Add Device'}
        </button>
      </div>

      {showAdd && <AddDeviceForm userId={userId} onAdded={() => { setShowAdd(false); load(); }} onCancel={() => setShowAdd(false)} />}

      {error && (
        <div style={{ fontSize: 13, color: '#B1552C', background: '#F5E6DC', padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search device..." style={{ ...inputStyle, width: 200 }} />
        <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          <option value="">All Customers</option>
          {customers.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 150 }}>
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#6B7280', fontSize: 13 }}>Loading…</div>
      ) : master.length === 0 ? (
        <div style={{ border: '1px dashed #E5E3DC', borderRadius: 10, padding: 32, textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No devices yet</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>Click "+ Add Device" above to add your first one.</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #E5E3DC', borderRadius: 10, background: '#fff' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F3EE', textAlign: 'left' }}>
                {['Device', 'Service', 'Customer', 'Supplier', 'Price', 'Margin', 'Status', 'Last Quoted', 'Remark', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', color: '#6B7280', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.key} style={{ borderTop: '1px solid #E5E3DC' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLORS[m.status] || '#9CA3AF', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{m.device}</div>
                        {m.package && <div style={{ fontSize: 11, color: '#6B7280' }}>{m.package}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid #E5E3DC', color: '#6B7280', whiteSpace: 'nowrap' }}>{m.serviceType}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{m.customer}</td>
                  <td style={{ padding: '10px 12px' }}>{m.supplier}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <EditableCell value={m.sellingPrice} type="number" decimals={4} prefix={m.currency} minWidth={80} onCommit={(v) => commitPriceEdit(m, v)} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <EditableCell value={m.marginPct} type="number" decimals={1} suffix="%" minWidth={55} onCommit={(v) => commitMarginEdit(m, v)} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <select value={m.status} onChange={(e) => commitStatusChange(m, e.target.value)} style={{ fontSize: 12, border: '1px solid #E5E3DC', borderRadius: 4, padding: '3px 5px' }}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>{formatDate(m.lastQuotedDate)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <EditableCell value={m.notes} type="text" placeholder="—" minWidth={100} onCommit={(v) => commitRemarkEdit(m, v)} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button onClick={() => handleDelete(m.key)} style={{ background: 'none', border: 'none', color: '#B1552C', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
