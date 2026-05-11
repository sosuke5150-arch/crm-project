import { useState, useEffect } from 'react';

const API = 'http://localhost:3001';

function getScoreColor(score) {
  if (score <= 2) return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
  if (score === 3) return { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' };
  return { bg: '#dcfce7', text: '#16a34a', border: '#86efac' };
}

function getClaimBadge(claim) {
  if (!claim || claim === 'なし') return { bg: '#dcfce7', text: '#16a34a' };
  if (/未解決|対応中/.test(claim)) return { bg: '#fee2e2', text: '#dc2626' };
  if (/要望/.test(claim)) return { bg: '#fef3c7', text: '#d97706' };
  if (/解決済/.test(claim)) return { bg: '#d1fae5', text: '#059669' };
  return { bg: 'var(--bg-input)', text: 'var(--text-muted)' };
}

function getTicketBadge(ticket) {
  if (!ticket) return { bg: 'var(--bg-input)', text: 'var(--text-muted)' };
  if (/大幅遅延/.test(ticket)) return { bg: '#fee2e2', text: '#dc2626' };
  if (/遅延あり/.test(ticket)) return { bg: '#fee2e2', text: '#dc2626' };
  if (/一部遅延/.test(ticket)) return { bg: '#ffedd5', text: '#c2410c' };
  if (/順調|安定/.test(ticket)) return { bg: '#dbeafe', text: '#1d4ed8' };
  return { bg: 'var(--bg-input)', text: 'var(--text-muted)' };
}

function getCategory(score) {
  if (score <= 2) return '要注意';
  if (score === 3) return '普通';
  return '良好';
}

const emptyForm = {
  customer_name: '', product_name: '', assignee: '', visitor: '',
  last_visit_date: '', claim_status: '', ticket_status: '', score: 3, notes: '',
};

const FILTERS = ['すべて', '要注意', '良好', '普通'];

export default function CustomerScoringList({ onSelect }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('すべて');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () =>
    fetch(`${API}/customer-scoring`).then(r => r.json()).then(setItems).catch(() => {});

  useEffect(() => { load(); }, []);

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
              {['顧客名', '顧客担当者', '最終訪問日', '訪問者', 'クレーム状況', 'チケット状態', '指数'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', background: 'var(--bg-th, var(--border))' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const sc = getScoreColor(item.score);
              const cl = getClaimBadge(item.claim_status);
              const tk = getTicketBadge(item.ticket_status);
              return (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--table-row-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: 14 }}>{item.customer_name || '-'}</div>
                    {item.product_name && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.product_name}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-td)', fontSize: 13 }}>{item.assignee || '-'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-td)', fontSize: 13 }}>{item.last_visit_date || '-'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-td)', fontSize: 13 }}>
                    {item.visitor ? `${item.visitor}（自社）` : '-'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {item.claim_status
                      ? <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: cl.bg, color: cl.text, whiteSpace: 'nowrap', display: 'inline-block' }}>{item.claim_status}</span>
                      : <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>-</span>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {item.ticket_status
                      ? <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: tk.bg, color: tk.text, whiteSpace: 'nowrap', display: 'inline-block' }}>{item.ticket_status}</span>
                      : <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>-</span>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '50%', background: sc.bg, color: sc.text, border: `2px solid ${sc.border}`, fontWeight: 700, fontSize: 15 }}>
                      {item.score}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)', fontSize: 13 }}>
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
                {[
                  ['customer_name', '顧客名', 'text', true],
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
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>指数 (1-5)</label>
                  <select
                    value={form.score}
                    onChange={e => setForm({ ...form, score: Number(e.target.value) })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13 }}
                  >
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                {[['claim_status', 'クレーム状況'], ['ticket_status', 'チケット状態']].map(([key, label]) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
                    <input
                      value={form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      placeholder={key === 'claim_status' ? 'なし / クレーム2件対応中 など' : '順調 / 遅延あり など'}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>メモ</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13, resize: 'vertical', fontFamily: 'Inter,sans-serif', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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
