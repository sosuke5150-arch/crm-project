import { useEffect, useRef, useState } from 'react';

const API = 'http://localhost:3001';

const emptyForm = { company: '', phone: '', postal_code: '', prefecture: '', address: '', building: '', url: '' };

export default function CustomerList({ onSelect }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const dragIndex = useRef(null);

  const load = () => fetch(`${API}/customers`).then(r => r.json()).then(setCustomers);

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('削除しますか？')) return;
    await fetch(`${API}/customers/${id}`, { method: 'DELETE' });
    load();
  };

  const handleEditStart = (c) => {
    setEditId(c.id);
    setEditForm({
      company: c.company || '',
      phone: c.phone || '',
      postal_code: c.postal_code || '',
      prefecture: c.prefecture || '',
      address: c.address || '',
      building: c.building || '',
      url: c.url || '',
    });
  };

  const handleEditSave = async (id) => {
    await fetch(`${API}/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditId(null);
    load();
  };

  const handleDragStart = (index) => {
    dragIndex.current = index;
  };

  const handleDrop = async (dropIndex) => {
    if (dragIndex.current === null || dragIndex.current === dropIndex) return;
    const updated = [...customers];
    const [moved] = updated.splice(dragIndex.current, 1);
    updated.splice(dropIndex, 0, moved);
    dragIndex.current = null;
    setCustomers(updated);
    await fetch(`${API}/customers/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: updated.map(c => c.id) }),
    });
  };

  return (
    <div>
      <h2>顧客管理一覧</h2>
      <div className="card">
        <table>
          <thead>
            <tr><th></th><th>会社名</th><th>郵便番号</th><th>都道府県</th><th>住所</th><th>建物名</th><th>URL</th><th></th></tr>
          </thead>
          <tbody>
            {customers.map((c, index) => editId === c.id ? (
              <tr key={c.id}>
                <td></td>
                <td><input value={editForm.company} onChange={e => setEditForm({...editForm, company: e.target.value})} /></td>
                <td><input value={editForm.postal_code} onChange={e => setEditForm({...editForm, postal_code: e.target.value})} /></td>
                <td><input value={editForm.prefecture} onChange={e => setEditForm({...editForm, prefecture: e.target.value})} /></td>
                <td><input value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} /></td>
                <td><input value={editForm.building} onChange={e => setEditForm({...editForm, building: e.target.value})} /></td>
                <td><input value={editForm.url} onChange={e => setEditForm({...editForm, url: e.target.value})} /></td>
                <td style={{whiteSpace:'nowrap'}}>
                  <button className="btn-edit" onClick={() => handleEditSave(c.id)}>保存</button>
                  <button className="btn-delete" onClick={() => setEditId(null)}>キャンセル</button>
                </td>
              </tr>
            ) : (
              <tr
                key={c.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                style={{cursor:'grab'}}
              >
                <td style={{color:'#3d4f6e', fontSize:'16px', cursor:'grab'}}>⠿</td>
                <td><span className="link" onClick={() => onSelect(c.id)}>{c.company || '-'}</span></td>
                <td>{c.postal_code || '-'}</td>
                <td>{c.prefecture || '-'}</td>
                <td>{c.address || '-'}</td>
                <td>{c.building || '-'}</td>
                <td>{c.url ? <a href={c.url} target="_blank" rel="noreferrer" style={{color:'#00d4ff'}}>{c.url}</a> : '-'}</td>
                <td style={{whiteSpace:'nowrap'}}>
                  <button className="btn-edit" onClick={() => handleEditStart(c)}>修正</button>
                  <button className="btn-delete" onClick={() => handleDelete(c.id)}>削除</button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={8} style={{textAlign:'center',color:'#4a5f82'}}>顧客データがありません</td></tr>}
          </tbody>
        </table>
        <form onSubmit={handleSubmit} style={{marginTop:'16px', marginBottom:0}}>
          <input placeholder="会社名 *" value={form.company} onChange={e => setForm({...form, company: e.target.value})} required />
          <input placeholder="郵便番号" value={form.postal_code} onChange={e => setForm({...form, postal_code: e.target.value})} />
          <input placeholder="都道府県" value={form.prefecture} onChange={e => setForm({...form, prefecture: e.target.value})} />
          <input placeholder="住所" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          <input placeholder="建物名" value={form.building} onChange={e => setForm({...form, building: e.target.value})} />
          <input placeholder="URL" value={form.url} onChange={e => setForm({...form, url: e.target.value})} />
          <button type="submit">追加</button>
        </form>
      </div>
    </div>
  );
}
