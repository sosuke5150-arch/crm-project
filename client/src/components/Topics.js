import { useEffect, useRef, useState } from 'react';

const API = 'http://localhost:3001';

const STATUS_OPTIONS = ['', '完了', '概算見積提示', '失注', '提案中', '受注', '締結済み', '利用中'];
const INSPECTION_OPTIONS = [
  '', '月額', '月額(2月〜)', '月額(3月〜)', '月額(4月〜)', '月額(5月〜)',
  '1月末', '2月末', '3月末', '4月', '4月末', '5月末', '6月末',
  '7月', '7月末', '8月', '8月末', '9月末', '10月末', '11月末', '12月末',
];
const SECTIONS = ['既存顧客案件', '新規顧客案件'];

const emptyForm = {
  section: '既存顧客案件',
  customer: '',
  project: '',
  status: '',
  amount: '',
  inspection_date: '',
  topics: '',
};

function getRowStyle(status) {
  const theme = document.body.dataset.theme || 'dark';
  const isLight = theme === 'excel' || theme === 'earth';
  switch (status) {
    case '完了':     return { background: isLight ? '#bdd7ee' : 'rgba(0,160,220,0.13)' };
    case '失注':     return { background: isLight ? '#d9d9d9' : 'rgba(140,140,140,0.18)' };
    case '受注':     return { background: isLight ? '#fffcd0' : 'rgba(240,220,0,0.07)' };
    case '締結済み': return { background: isLight ? '#f4cccc' : 'rgba(220,60,60,0.12)' };
    case '利用中':   return { background: isLight ? '#e2efda' : 'rgba(80,200,100,0.11)' };
    default:         return {};
  }
}

export default function Topics() {
  const [items, setItems]       = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm]         = useState(emptyForm);
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const dragIndex = useRef(null);

  const load = () => {
    fetch(`${API}/topics`).then(r => r.json()).then(setItems).catch(() => {});
    fetch(`${API}/customers`).then(r => r.json()).then(setCustomers).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API}/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('削除しますか？')) return;
    await fetch(`${API}/topics/${id}`, { method: 'DELETE' });
    load();
  };

  const handleDuplicate = async (item) => {
    await fetch(`${API}/topics/duplicate/${item.id}`, { method: 'POST' });
    load();
  };

  const handleEditStart = (item) => {
    setEditId(item.id);
    setEditForm({
      section:         item.section || '既存顧客案件',
      customer:        item.customer || '',
      project:         item.project || '',
      status:          item.status || '',
      amount:          item.amount || '',
      inspection_date: item.inspection_date || '',
      topics:          item.topics || '',
    });
  };

  const handleEditSave = async (id) => {
    await fetch(`${API}/topics/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditId(null);
    load();
  };

  const handleDragStart = (index) => { dragIndex.current = index; };
  const handleDrop = async (dropIndex) => {
    if (dragIndex.current === null || dragIndex.current === dropIndex) return;
    const updated = [...items];
    const [moved] = updated.splice(dragIndex.current, 1);
    updated.splice(dropIndex, 0, moved);
    dragIndex.current = null;
    setItems(updated);
    await fetch(`${API}/topics/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: updated.map(d => d.id) }),
    });
  };

  const companyNames = customers.map(c => c.company).filter(Boolean);
  const isLight = theme === 'excel' || theme === 'earth';

  return (
    <div>
      <h2 style={{ marginBottom: '12px' }}>トピックス</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>顧客</th>
              <th>プロジェクト</th>
              <th>ステータス</th>
              <th>金額</th>
              <th>検収(予定)完了</th>
              <th>トピックス</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.flatMap(section => {
              const sectionItems = items.filter(it => it.section === section);
              const rows = [];

              rows.push(
                <tr key={`hdr-${section}`}>
                  <td colSpan={8} style={{
                    fontWeight: 700, fontSize: 13,
                    padding: '10px 12px 6px',
                    color: 'var(--accent)',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-th)',
                    letterSpacing: '0.04em',
                  }}>
                    【{section}】
                  </td>
                </tr>
              );

              if (sectionItems.length === 0) {
                rows.push(
                  <tr key={`empty-${section}`}>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '12px', fontSize: 12 }}>
                      データがありません
                    </td>
                  </tr>
                );
              }

              sectionItems.forEach((item) => {
                const globalIndex = items.indexOf(item);
                const rowStyle = getRowStyle(item.status);

                if (editId === item.id) {
                  rows.push(
                    <tr key={item.id} style={rowStyle}>
                      <td></td>
                      <td>
                        <select value={editForm.customer} onChange={e => setEditForm({ ...editForm, customer: e.target.value })}>
                          <option value="">—</option>
                          {companyNames.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td>
                        <input value={editForm.project} onChange={e => setEditForm({ ...editForm, project: e.target.value })} style={{ width: '100%' }} />
                      </td>
                      <td>
                        <select className="status-select" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || '—'}</option>)}
                        </select>
                      </td>
                      <td>
                        <input value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} style={{ width: '100%', textAlign: 'right' }} />
                      </td>
                      <td>
                        <select value={editForm.inspection_date} onChange={e => setEditForm({ ...editForm, inspection_date: e.target.value })}>
                          {INSPECTION_OPTIONS.map(s => <option key={s} value={s}>{s || '—'}</option>)}
                        </select>
                      </td>
                      <td>
                        <textarea
                          value={editForm.topics}
                          onChange={e => setEditForm({ ...editForm, topics: e.target.value })}
                          rows={3}
                          style={{ width: '100%', resize: 'vertical', background: 'var(--bg-panel)', color: 'var(--text-body)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', fontFamily: 'Inter,sans-serif', fontSize: '13px' }}
                        />
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn-edit" onClick={() => handleEditSave(item.id)}>保存</button>
                        <button className="btn-delete" onClick={() => setEditId(null)}>キャンセル</button>
                      </td>
                    </tr>
                  );
                } else {
                  rows.push(
                    <tr
                      key={item.id}
                      draggable
                      onDragStart={() => handleDragStart(globalIndex)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => handleDrop(globalIndex)}
                      style={{ ...rowStyle, cursor: 'grab' }}
                    >
                      {(() => {
                        const lostStyle = item.status === '失注' ? { color: '#e53935' } : item.status === '受注' ? { color: isLight ? '#1565c0' : '#00bcd4' } : {};
                        return (<>
                          <td style={{ color: 'var(--text-faint)', fontSize: '16px', cursor: 'grab' }}>⠿</td>
                          <td style={lostStyle}>{item.customer || '-'}</td>
                          <td style={lostStyle}>{item.project || '-'}</td>
                          <td style={lostStyle}>{item.status || '-'}</td>
                          <td style={{ textAlign: 'right', ...lostStyle }}>{item.amount ? `¥${Number(String(item.amount).replace(/,/g, '')).toLocaleString()}` : '-'}</td>
                          <td style={lostStyle}>{item.inspection_date || '-'}</td>
                          <td style={{ whiteSpace: 'pre-wrap', maxWidth: '300px', ...lostStyle }}>{item.topics || '-'}</td>
                        </>);
                      })()}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn-edit" onClick={() => handleEditStart(item)}>修正</button>
                        <button className="btn-edit" onClick={() => handleDuplicate(item)} style={{ color: '#a78bfa' }}>複製</button>
                        <button className="btn-delete" onClick={() => handleDelete(item.id)}>削除</button>
                      </td>
                    </tr>
                  );
                }
              });

              return rows;
            })}

            {items.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-faint)' }}>データがありません</td></tr>
            )}
          </tbody>
        </table>

        <form onSubmit={handleSubmit} style={{ marginTop: '16px', marginBottom: 0 }}>
          <select value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}>
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })}>
            <option value="">顧客を選択</option>
            {companyNames.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            placeholder="プロジェクト *"
            value={form.project}
            onChange={e => setForm({ ...form, project: e.target.value })}
            required
          />
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="">ステータス</option>
            {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            placeholder="金額"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
          />
          <select value={form.inspection_date} onChange={e => setForm({ ...form, inspection_date: e.target.value })}>
            <option value="">検収(予定)完了</option>
            {INSPECTION_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            placeholder="トピックス"
            value={form.topics}
            onChange={e => setForm({ ...form, topics: e.target.value })}
          />
          <button type="submit">追加</button>
        </form>
      </div>
    </div>
  );
}
