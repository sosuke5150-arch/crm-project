import { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:3001';

const SCORE_DARK  = (s) => s <= 3 ? { text:'#f87171', bar:'#ef4444', dim:'rgba(239,68,68,0.18)' }   : s <= 6 ? { text:'#fbbf24', bar:'#f59e0b', dim:'rgba(245,158,11,0.18)' }  : { text:'#34d399', bar:'#10b981', dim:'rgba(16,185,129,0.18)' };
const SCORE_LIGHT = (s) => s <= 3 ? { text:'#dc2626', bar:'#ef4444', dim:'#fecaca' }                  : s <= 6 ? { text:'#b45309', bar:'#f59e0b', dim:'#fde68a' }                 : { text:'#059669', bar:'#10b981', dim:'#a7f3d0' };
function getScoreColor(score, light) { return light ? SCORE_LIGHT(score) : SCORE_DARK(score); }

const CLAIM_BADGE_DARK = {
  'なし':              { icon:'✔', text:'#34d399', bg:'rgba(52,211,153,0.12)',  border:'rgba(52,211,153,0.35)',  shadow:'0 0 8px rgba(52,211,153,0.2)'  },
  '軽度クレーム対応中':  { icon:'⚡', text:'#fbbf24', bg:'rgba(251,191,36,0.12)',  border:'rgba(251,191,36,0.35)',  shadow:'0 0 8px rgba(251,191,36,0.2)'  },
  '大型クレーム対応中':  { icon:'🔥', text:'#fb923c', bg:'rgba(251,146,60,0.12)',  border:'rgba(251,146,60,0.35)',  shadow:'0 0 8px rgba(251,146,60,0.2)'  },
  '是正検討中':         { icon:'▲', text:'#f87171', bg:'rgba(248,113,113,0.12)', border:'rgba(248,113,113,0.35)', shadow:'0 0 8px rgba(248,113,113,0.2)' },
};
const CLAIM_BADGE_LIGHT = {
  'なし':              { icon:'✔', text:'#059669', bg:'#d1fae5', border:'#6ee7b7', shadow:'none' },
  '軽度クレーム対応中':  { icon:'⚡', text:'#b45309', bg:'#fef3c7', border:'#fcd34d', shadow:'none' },
  '大型クレーム対応中':  { icon:'🔥', text:'#c2410c', bg:'#ffedd5', border:'#fdba74', shadow:'none' },
  '是正検討中':         { icon:'▲', text:'#dc2626', bg:'#fee2e2', border:'#fca5a5', shadow:'none' },
};

const TICKET_BADGE_DARK = {
  '順調':    { dots:3, text:'#34d399', bg:'rgba(52,211,153,0.12)', border:'rgba(52,211,153,0.35)', shadow:'0 0 8px rgba(52,211,153,0.2)' },
  'やや滞留': { dots:2, text:'#fbbf24', bg:'rgba(251,191,36,0.12)', border:'rgba(251,191,36,0.35)', shadow:'0 0 8px rgba(251,191,36,0.2)' },
  '滞留':    { dots:1, text:'#f87171', bg:'rgba(248,113,113,0.12)', border:'rgba(248,113,113,0.35)', shadow:'0 0 8px rgba(248,113,113,0.2)' },
};
const TICKET_BADGE_LIGHT = {
  '順調':    { dots:3, text:'#059669', bg:'#d1fae5', border:'#6ee7b7', shadow:'none' },
  'やや滞留': { dots:2, text:'#b45309', bg:'#fef3c7', border:'#fcd34d', shadow:'none' },
  '滞留':    { dots:1, text:'#dc2626', bg:'#fee2e2', border:'#fca5a5', shadow:'none' },
};

function getCategory(score) {
  if (score <= 3) return '要注意';
  if (score <= 6) return '普通';
  return '良好';
}

const emptyForm = {
  customer_name: '', product_name: '', assignee: '', visitor: '',
  last_visit_date: '', claim_status: 'なし', ticket_status: '順調', score: 5, notes: '',
};

const FILTERS = ['すべて', '要注意', '良好', '普通'];
const CLAIM_OPTIONS = ['なし', '軽度クレーム対応中', '大型クレーム対応中', '是正検討中'];
const TICKET_OPTIONS = ['順調', 'やや滞留', '滞留'];

export default function CustomerScoringList({ onSelect }) {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState('すべて');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [theme, setTheme] = useState(document.body.dataset.theme || 'dark');
  const dragId = useRef(null);

  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(document.body.dataset.theme || 'dark'));
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const load = () =>
    fetch(`${API}/customer-scoring`).then(r => r.json()).then(setItems).catch(() => {});

  useEffect(() => {
    load();
    fetch(`${API}/customers`).then(r => r.json()).then(setCustomers).catch(() => {});
  }, []);

  const filtered = filter === 'すべて' ? items : items.filter(it => getCategory(it.score) === filter);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API}/customer-scoring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const handleEditStart = (item) => {
    setEditId(item.id);
    setEditForm({
      customer_name: item.customer_name || '',
      product_name: item.product_name || '',
      assignee: item.assignee || '',
      visitor: item.visitor || '',
      last_visit_date: item.last_visit_date || '',
      claim_status: item.claim_status || '',
      ticket_status: item.ticket_status || '',
      score: item.score || 3,
      notes: item.notes || '',
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    await fetch(`${API}/customer-scoring/${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditId(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('削除しますか？')) return;
    await fetch(`${API}/customer-scoring/${id}`, { method: 'DELETE' });
    load();
  };

  const handleDuplicate = async (item) => {
    const { id, created_at, ...data } = item;
    await fetch(`${API}/customer-scoring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    load();
  };

  const handleDrop = async (dropId) => {
    if (dragId.current === null || dragId.current === dropId) return;
    const fromIdx = filtered.findIndex(d => d.id === dragId.current);
    const toIdx = filtered.findIndex(d => d.id === dropId);
    if (fromIdx === -1 || toIdx === -1) { dragId.current = null; return; }
    const newOrder = [...filtered];
    const [moved] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, moved);
    dragId.current = null;
    const filteredIds = new Set(newOrder.map(d => d.id));
    const rest = items.filter(d => !filteredIds.has(d.id));
    const newItems = [...newOrder, ...rest].map((d, i) => ({ ...d, sort_order: i }));
    setItems(newItems);
    await fetch(`${API}/customer-scoring/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: newItems.map(d => d.id) }),
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>顧客スコアリング</h2>
        <button
          onClick={() => setShowForm(true)}
          style={{ padding: '8px 16px', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 6, color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + 新規登録
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 4 }}>絞り込み：</span>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: filter === f ? 700 : 400,
              background: filter === f ? 'var(--accent)' : 'var(--bg-panel)',
              color: filter === f ? '#fff' : 'var(--text-body)',
              border: filter === f ? '1px solid var(--accent)' : '1px solid var(--border)',
              transition: 'all 0.15s',
            }}
          >{f}</button>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['', '顧客名', '顧客担当者', '最終訪問日', '経過日', '訪問者（自社）', 'クレーム状況', 'チケット消化状況', 'エンゲージメント強度', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: 'var(--bg-th, var(--border))', minWidth: h === '最終訪問日' ? 120 : undefined }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const isLight = ['excel', 'earth'].includes(theme);
              const sc = getScoreColor(item.score, isLight);
              const CLAIM_BADGE = isLight ? CLAIM_BADGE_LIGHT : CLAIM_BADGE_DARK;
              const TICKET_BADGE = isLight ? TICKET_BADGE_LIGHT : TICKET_BADGE_DARK;
              const cl = CLAIM_BADGE[item.claim_status] || CLAIM_BADGE['なし'];
              const tk = TICKET_BADGE[item.ticket_status] || TICKET_BADGE['順調'];
              return (
                <tr
                  key={item.id}
                  draggable
                  onDragStart={() => { dragId.current = item.id; }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(item.id)}
                  onClick={() => onSelect(item.id)}
                  style={{ cursor: 'grab', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--table-row-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                >
                  <td style={{ padding: '12px 14px', color: 'var(--text-faint)', fontSize: 16 }}>⠿</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: 14 }}>{item.customer_name || '-'}</div>
                    {item.product_name && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.product_name}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-td)', fontSize: 13 }}>{item.assignee || '-'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-td)', fontSize: 13 }}>{item.last_visit_date || '-'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {(() => {
                      if (!item.last_visit_date) return <span style={{ color: 'var(--text-faint)' }}>-</span>;
                      const days = Math.floor((Date.now() - new Date(item.last_visit_date)) / 86400000);
                      const color = days >= 180 ? '#dc2626' : days >= 90 ? '#c2410c' : 'var(--text-td)';
                      return <span style={{ color, fontWeight: days >= 90 ? 600 : 400 }}>{days}日</span>;
                    })()}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-td)', fontSize: 13 }}>
                    {item.visitor || '-'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: cl.bg, color: cl.text, border: `1px solid ${cl.border}`, boxShadow: cl.shadow, whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 10 }}>{cl.icon}</span>{item.claim_status || 'なし'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: tk.bg, color: tk.text, border: `1px solid ${tk.border}`, boxShadow: tk.shadow, whiteSpace: 'nowrap' }}>
                      {[1,2,3].map(i => (
                        <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i <= tk.dots ? tk.text : 'rgba(255,255,255,0.15)', display: 'inline-block' }} />
                      ))}
                      {item.ticket_status || '順調'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: sc.text, lineHeight: 1 }}>{item.score}</span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: 10 }, (_, i) => (
                          <div key={i} style={{ width: 5, height: 5, borderRadius: 1, background: i < item.score ? sc.bar : sc.dim, transition: 'background 0.2s' }} />
                        ))}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                    <button className="btn-edit" onClick={() => handleEditStart(item)}>修正</button>
                    <button className="btn-edit" onClick={() => handleDuplicate(item)} style={{ color: '#a78bfa' }}>複製</button>
                    <button className="btn-delete" onClick={() => handleDelete(item.id)}>削除</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)', fontSize: 13 }}>
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editId !== null && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setEditId(null)}
        >
          <div
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 560, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px', color: 'var(--text-heading)', fontSize: 16 }}>スコアリング修正</h3>
            <form onSubmit={handleEditSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>顧客名 *</label>
                  <select required value={editForm.customer_name} onChange={e => setEditForm({ ...editForm, customer_name: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13 }}>
                    <option value="">選択してください</option>
                    {customers.map(c => <option key={c.id} value={c.company}>{c.company}</option>)}
                  </select>
                </div>
                {[
                  ['product_name', 'プロダクト名', 'text'],
                  ['assignee', '顧客担当者', 'text'],
                  ['visitor', '訪問者（自社）', 'text'],
                  ['last_visit_date', '最終訪問日', 'date'],
                ].map(([key, label, type]) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
                    <input type={type} value={editForm[key]} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>エンゲージメント強度 (1-10)</label>
                  <select value={editForm.score} onChange={e => setEditForm({ ...editForm, score: Number(e.target.value) })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13 }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>クレーム状況</label>
                  <select value={editForm.claim_status} onChange={e => setEditForm({ ...editForm, claim_status: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13 }}>
                    {CLAIM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>チケット消化状況</label>
                  <select value={editForm.ticket_status} onChange={e => setEditForm({ ...editForm, ticket_status: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13 }}>
                    {TICKET_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 20, width: '100%' }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>メモ</label>
                <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={3}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13, resize: 'vertical', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
                <button type="button" onClick={() => setEditId(null)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>キャンセル</button>
                <button type="submit" style={{ padding: '8px 22px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowForm(false)}
        >
          <div
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 560, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px', color: 'var(--text-heading)', fontSize: 16 }}>新規スコアリング登録</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>顧客名 *</label>
                  <select
                    required
                    value={form.customer_name}
                    onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: form.customer_name ? 'var(--text-body)' : 'var(--text-muted)', fontSize: 13 }}
                  >
                    <option value="">選択してください</option>
                    {customers.map(c => <option key={c.id} value={c.company}>{c.company}</option>)}
                  </select>
                </div>
                {[
                  ['product_name', 'プロダクト名', 'text', false],
                  ['assignee', '顧客担当者', 'text', false],
                  ['visitor', '訪問者（自社）', 'text', false],
                  ['last_visit_date', '最終訪問日', 'date', false],
                ].map(([key, label, type, required]) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}{required && ' *'}</label>
                    <input
                      type={type}
                      required={required}
                      value={form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>エンゲージメント強度 (1-10)</label>
                  <select
                    value={form.score}
                    onChange={e => setForm({ ...form, score: Number(e.target.value) })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13 }}
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>クレーム状況</label>
                  <select value={form.claim_status} onChange={e => setForm({ ...form, claim_status: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13 }}>
                    {CLAIM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>チケット消化状況</label>
                  <select value={form.ticket_status} onChange={e => setForm({ ...form, ticket_status: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13 }}>
                    {TICKET_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 20, width: '100%' }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>メモ</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13, resize: 'vertical', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>キャンセル</button>
                <button type="submit" style={{ padding: '8px 22px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>登録</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
