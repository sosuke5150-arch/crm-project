import { useEffect, useState } from 'react';

const API = 'http://localhost:3001';

const STATUS_LABELS = { open: '進行中', won: '受注', lost: '失注' };

export default function DealList() {
  const [deals, setDeals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ customer_id: '', title: '', amount: '', status: 'open' });

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
    setForm({ customer_id: '', title: '', amount: '', status: 'open' });
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

  return (
    <div>
      <h2>案件管理</h2>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <select value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} required>
            <option value="">顧客を選択 *</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="案件名 *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
          <input type="number" placeholder="金額（円）" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
          <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            <option value="open">進行中</option>
            <option value="won">受注</option>
            <option value="lost">失注</option>
          </select>
          <button type="submit">追加</button>
        </form>
        <table>
          <thead>
            <tr><th>案件名</th><th>顧客</th><th>金額</th><th>ステータス</th><th>登録日</th><th></th></tr>
          </thead>
          <tbody>
            {deals.map(d => (
              <tr key={d.id}>
                <td>{d.title}</td>
                <td>{d.customer_name}</td>
                <td>{d.amount ? `¥${Number(d.amount).toLocaleString()}` : '-'}</td>
                <td>
                  <select
                    className="status-select"
                    value={d.status}
                    onChange={e => handleStatus(d.id, e.target.value)}
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </td>
                <td>{new Date(d.created_at).toLocaleDateString('ja-JP')}</td>
                <td><button className="btn-delete" onClick={() => handleDelete(d.id)}>削除</button></td>
              </tr>
            ))}
            {deals.length === 0 && <tr><td colSpan={6} style={{textAlign:'center',color:'#aaa'}}>案件データがありません</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
