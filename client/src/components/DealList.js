import { useEffect, useRef, useState } from 'react';

const API = 'http://localhost:3001';

const STATUS_LABELS = { proposing: '提案中', planned: '提案予定', won: '受注', monthly: '月額', done: '完了', lost: '失注' };

const INSPECTION_OPTIONS = ['9月検収','10月検収','11月検収','12月検収','1月検収','2月検収','3月検収','4月検収','5月検収','6月検収','7月検収','8月検収'];

const emptyForm = { customer_id: '', title: '', status: 'proposing', amount: '', inspection_date: '', topics: '' };

export default function DealList() {
  const [deals, setDeals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const dragIndex = useRef(null);

  const load = () => {
    fetch(`${API}/deals`).then(r => r.json()).then(setDeals);
    fetch(`${API}/customers`).then(r => r.json()).then(setCustomers);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API}/deals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    load();
  };

  const handleStatus = async (id, status) => {
    await fetch(`${API}/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('削除しますか？')) return;
    await fetch(`${API}/deals/${id}`, { method: 'DELETE' });
    load();
  };

  const handleEditStart = (d) => {
    setEditId(d.id);
    setEditForm({
      customer_id: d.customer_id,
      title: d.title,
      status: d.status,
      amount: d.amount || '',
      inspection_date: d.inspection_date || '',
      topics: d.topics || '',
    });
  };

  const handleDragStart = (index) => {
    dragIndex.current = index;
  };

  const handleDrop = async (dropIndex) => {
    if (dragIndex.current === null || dragIndex.current === dropIndex) return;
    const updated = [...deals];
    const [moved] = updated.splice(dragIndex.current, 1);
    updated.splice(dropIndex, 0, moved);
    dragIndex.current = null;
    setDeals(updated);
    await fetch(`${API}/deals/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: updated.map(d => d.id) }),
    });
  };

  const handleEditSave = async (id) => {
    await fetch(`${API}/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditId(null);
    load();
  };

  return (
    <div>
      <h2>案件管理一覧</h2>
      <div className="card">
        <table>
          <thead>
            <tr><th></th><th>顧客</th><th>案件名</th><th>ステータス</th><th>金額</th><th>検収月</th><th>トピックス</th><th></th></tr>
          </thead>
          <tbody>
            {deals.map((d, index) => editId === d.id ? (
              <tr key={d.id}>
                <td></td>
                <td>
                  <select value={editForm.customer_id} onChange={e => setEditForm({...editForm, customer_id: e.target.value})}>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                  </select>
                </td>
                <td><input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} style={{width:'100%'}} /></td>
                <td>
                  <select className="status-select" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </td>
                <td><input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} style={{width:'100%'}} /></td>
                <td>
                  <select value={editForm.inspection_date} onChange={e => setEditForm({...editForm, inspection_date: e.target.value})}>
                    <option value=""></option>
                    {INSPECTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td><textarea value={editForm.topics} onChange={e => setEditForm({...editForm, topics: e.target.value})} rows={2} style={{width:'100%', resize:'vertical'}} /></td>
                <td style={{whiteSpace:'nowrap'}}>
                  <button className="btn-edit" onClick={() => handleEditSave(d.id)}>保存</button>
                  <button className="btn-delete" onClick={() => setEditId(null)}>キャンセル</button>
                </td>
              </tr>
            ) : (
              <tr
                key={d.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                style={{cursor:'grab'}}
              >
                <td style={{color:'#3d4f6e', fontSize:'16px', cursor:'grab'}}>⠿</td>
                <td>{d.customer_name}</td>
                <td>{d.title}</td>
                <td>
                  <select className="status-select" value={d.status} onChange={e => handleStatus(d.id, e.target.value)}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </td>
                <td>{d.amount ? `¥${Number(d.amount).toLocaleString()}` : '-'}</td>
                <td>{d.inspection_date || '-'}</td>
                <td style={{whiteSpace:'pre-wrap', maxWidth:'200px'}}>{d.topics || '-'}</td>
                <td style={{whiteSpace:'nowrap'}}>
                  <button className="btn-edit" onClick={() => handleEditStart(d)}>修正</button>
                  <button className="btn-delete" onClick={() => handleDelete(d.id)}>削除</button>
                </td>
              </tr>
            ))}
            {deals.length === 0 && <tr><td colSpan={8} style={{textAlign:'center',color:'#4a5f82'}}>案件データがありません</td></tr>}

            {deals.length > 0 && (
              <tr>
                <td colSpan={4} style={{textAlign:'right', color:'#6b7fa3', fontWeight:600, paddingTop:'16px'}}>合計</td>
                <td style={{color:'#00d4ff', fontWeight:700, paddingTop:'16px'}}>
                  ¥{deals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0).toLocaleString()}
                </td>
                <td colSpan={3}></td>
              </tr>
            )}
          </tbody>
        </table>
        <datalist id="title-suggestions">
          {[...new Set(deals.map(d => d.title).filter(Boolean))].map(t => <option key={t} value={t} />)}
        </datalist>
        <datalist id="topics-suggestions">
          {[...new Set(deals.map(d => d.topics).filter(Boolean))].map(t => <option key={t} value={t} />)}
        </datalist>
        <form onSubmit={handleSubmit} style={{marginTop:'16px', marginBottom:0}}>
          <select value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} required>
            <option value="">顧客を選択 *</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
          </select>
          <input placeholder="案件名 *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} list="title-suggestions" required />
          <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="number" placeholder="金額（円）" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
          <select value={form.inspection_date} onChange={e => setForm({...form, inspection_date: e.target.value})}>
            <option value="">検収月</option>
            {INSPECTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <input placeholder="トピックス" value={form.topics} onChange={e => setForm({...form, topics: e.target.value})} list="topics-suggestions" />
          <button type="submit">追加</button>
        </form>
      </div>
    </div>
  );
}
