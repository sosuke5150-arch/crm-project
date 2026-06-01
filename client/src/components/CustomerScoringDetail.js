import { useState, useEffect } from 'react';

const API = 'http://localhost:3001';

const SCORE_COMMENTS = {
  5: '非常に良好な関係を維持しています。継続的なフォローを続けてください。',
  4: '良好な関係です。現状を維持しながら更なる向上を目指しましょう。',
  3: '普通の状態です。改善の余地があります。定期的なコミュニケーションを強化してください。',
  2: '注意が必要です。課題の早期解決を優先してください。',
  1: '緊急対応が必要です。即座にエスカレーションを検討してください。',
};

function getScoreLabel(score) {
  if (score <= 2) return { label: '要注意', color: '#dc2626', bg: '#fee2e2' };
  if (score === 3) return { label: '普通', color: '#d97706', bg: '#fef3c7' };
  return { label: '良好', color: '#16a34a', bg: '#dcfce7' };
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

function StarRating({ score }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: 32, color: i <= score ? '#f59e0b' : 'var(--border-mid)', lineHeight: 1 }}>★</span>
      ))}
    </div>
  );
}

const emptyForm = {
  customer_name: '', product_name: '', assignee: '', visitor: '',
  last_visit_date: '', president_visit_date: '', claim_status: '', ticket_status: '', score: 3, notes: '',
};

export default function CustomerScoringDetail({ scoringId, onBack }) {
  const [item, setItem] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () =>
    fetch(`${API}/customer-scoring/${scoringId}`)
      .then(r => r.json())
      .then(data => { setItem(data); setForm({ ...emptyForm, ...data }); })
      .catch(() => {});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [scoringId]);

  const handleSave = async () => {
    await fetch(`${API}/customer-scoring/${scoringId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setEditing(false);
    load();
  };

  const handleDelete = async () => {
    if (!window.confirm('このスコアリングデータを削除しますか？')) return;
    await fetch(`${API}/customer-scoring/${scoringId}`, { method: 'DELETE' });
    onBack();
  };

  if (!item) return <div style={{ padding: 40, color: 'var(--text-muted)', textAlign: 'center' }}>読み込み中...</div>;

  const sl = getScoreLabel(item.score);
  const cl = getClaimBadge(item.claim_status);
  const tk = getTicketBadge(item.ticket_status);

  const inputStyle = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 13, boxSizing: 'border-box' };
  const labelStyle = { fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 };

  return (
    <div>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
            ← 戻る
          </button>
          <h2 style={{ margin: 0, color: 'var(--text-heading)' }}>{item.customer_name}</h2>
          <span style={{ padding: '3px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: sl.bg, color: sl.color }}>{sl.label}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setForm({ ...emptyForm, ...item }); }} style={{ padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleSave} style={{ padding: '7px 22px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>保存</button>
            </>
          ) : (
            <>
              <button className="btn-edit" onClick={() => setEditing(true)}>修正</button>
              <button className="btn-delete" onClick={handleDelete}>削除</button>
            </>
          )}
        </div>
      </div>

      {/* 上段2カラム */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* 基本情報 */}
        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>基本情報</h3>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['customer_name', '顧客名', 'text'],
                ['product_name', 'プロダクト名', 'text'],
                ['assignee', '顧客担当者', 'text'],
                ['visitor', '訪問者（自社）', 'text'],
                ['last_visit_date', '最終訪問日', 'date'],
                ['president_visit_date', '社長訪問日', 'date'],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} style={inputStyle} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['顧客名', item.customer_name],
                ['プロダクト名', item.product_name],
                ['顧客担当者', item.assignee],
                ['訪問者', item.visitor ? `${item.visitor}（自社）` : ''],
                ['最終訪問日', item.last_visit_date],
                ['社長訪問日', item.president_visit_date],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 100, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-body)', fontWeight: 500 }}>{value || '-'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* クレーム・チケット */}
        <div className="card">
          <h3 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>クレーム・チケット状況</h3>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['claim_status', 'クレーム状況'], ['ticket_status', 'チケット状態']].map(([key, label]) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={labelStyle}>メモ</label>
                <textarea
                  value={form.notes || ''}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Inter,sans-serif' }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>クレーム状況</div>
                {item.claim_status
                  ? <span style={{ padding: '4px 14px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: cl.bg, color: cl.text, display: 'inline-block' }}>{item.claim_status}</span>
                  : <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>-</span>}
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>チケット状態</div>
                {item.ticket_status
                  ? <span style={{ padding: '4px 14px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: tk.bg, color: tk.text, display: 'inline-block' }}>{item.ticket_status}</span>
                  : <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>-</span>}
              </div>
              {item.notes && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>メモ</div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-body)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{item.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 総合エンゲージメント指数 */}
      <div className="card">
        <h3 style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>総合エンゲージメント指数</h3>
        {editing ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 4 }}>指数：</span>
            {[1, 2, 3, 4, 5].map(n => {
              const active = form.score === n;
              const c = getScoreLabel(n);
              return (
                <button
                  key={n}
                  onClick={() => setForm({ ...form, score: n })}
                  style={{
                    width: 42, height: 42, borderRadius: '50%', fontWeight: 700, fontSize: 16, cursor: 'pointer',
                    border: `2px solid ${active ? c.color : 'var(--border)'}`,
                    background: active ? c.bg : 'none',
                    color: active ? c.color : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >{n}</button>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <StarRating score={item.score} />
              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: sl.color }}>{item.score}</span>
                <span style={{ fontSize: 16, color: 'var(--text-muted)', marginLeft: 4 }}>/ 5</span>
              </div>
            </div>
            <div style={{ flex: 1, padding: '16px 20px', borderRadius: 10, background: sl.bg, borderLeft: `4px solid ${sl.color}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: sl.color, marginBottom: 8 }}>{sl.label}</div>
              <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{SCORE_COMMENTS[item.score]}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
