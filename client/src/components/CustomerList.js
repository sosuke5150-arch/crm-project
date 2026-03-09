import { useEffect, useState } from 'react';

const API = 'http://localhost:3001';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });

  const load = () => fetch(`${API}/customers`).then(r => r.json()).then(setCustomers);

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ name: '', email: '', phone: '', company: '' });
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('削除しますか？')) return;
    await fetch(`${API}/customers/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <h2>顧客管理</h2>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <input placeholder="名前 *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <input placeholder="会社名" value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
          <input placeholder="メール" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <input placeholder="電話番号" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          <button type="submit">追加</button>
        </form>
        <table>
          <thead>
            <tr><th>名前</th><th>会社名</th><th>メール</th><th>電話番号</th><th>登録日</th><th></th></tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.company || '-'}</td>
                <td>{c.email || '-'}</td>
                <td>{c.phone || '-'}</td>
                <td>{new Date(c.created_at).toLocaleDateString('ja-JP')}</td>
                <td><button className="btn-delete" onClick={() => handleDelete(c.id)}>削除</button></td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={6} style={{textAlign:'center',color:'#aaa'}}>顧客データがありません</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
