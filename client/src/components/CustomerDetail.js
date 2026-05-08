import { useEffect, useState } from 'react';

const API = 'http://localhost:3001';

const formatPhone = (phone) => {
  if (!phone) return '-';
  const n = phone.replace(/\D/g, '');
  if (n.length === 11) return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
  if (n.length === 10) return `${n.slice(0,3)}-${n.slice(3,6)}-${n.slice(6)}`;
  return phone;
};

const STATUS_LABELS = { proposing: '提案中', planned: '提案予定', waiting: '受注待ち', won: '受注', developing: '開発中', shikakake: '仕掛計上', monthly: '月額', done: '完了', forecast: '見込' };
const STATUS_COLORS = { proposing: '#f9a8d4', planned: '#f9a8d4', waiting: '#fb923c', developing: '#facc15', shikakake: '#facc15', forecast: '#ff4d6a' };

const INSPECTION_OPTIONS = ['9月検収','10月検収','11月検収','12月検収','1月検収','2月検収','3月検収','4月検収','5月検収','6月検収','7月検収','8月検収'];

export default function CustomerDetail({ customerId, onBack, onNavigate }) {
  const [customer, setCustomer] = useState(null);
  const [deals, setDeals] = useState([]);
  const [customerIds, setCustomerIds] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({});
  const [systems, setSystems] = useState([]);
  const [editingService, setEditingService] = useState(false);
  const [newSystem, setNewSystem] = useState({ name: '', start_date: '', description: '', assignee: '' });
  const [editSystemId, setEditSystemId] = useState(null);
  const [editSystemForm, setEditSystemForm] = useState({});

  const loadSystems = () =>
    fetch(`${API}/customers/${customerId}/systems`).then(r => r.json()).then(setSystems);

  const load = () => {
    fetch(`${API}/customers/${customerId}`).then(r => r.json()).then(setCustomer);
    fetch(`${API}/deals?customer_id=${customerId}`).then(r => r.json()).then(setDeals);
    loadSystems();
  };

  const handleAddSystem = async () => {
    if (!newSystem.name.trim()) return;
    await fetch(`${API}/customers/${customerId}/systems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSystem),
    });
    setNewSystem({ name: '', start_date: '', description: '', assignee: '' });
    loadSystems();
  };

  const handleEditSystem = async (systemId) => {
    await fetch(`${API}/customers/${customerId}/systems/${systemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editSystemForm),
    });
    setEditSystemId(null);
    loadSystems();
  };

  const handleDeleteSystem = async (systemId) => {
    await fetch(`${API}/customers/${customerId}/systems/${systemId}`, { method: 'DELETE' });
    loadSystems();
  };

  useEffect(() => {
    fetch(`${API}/customers`).then(r => r.json()).then(data => setCustomerIds(data.map(c => c.id)));
  }, []);

  useEffect(() => { load(); }, [customerId]);

  const handleStatusChange = async (id, status) => {
    await fetch(`${API}/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const handleCustomerEditStart = () => {
    setCustomerForm({
      company: customer.company || '',
      postal_code: customer.postal_code || '',
      prefecture: customer.prefecture || '',
      address: customer.address || '',
      building: customer.building || '',
      url: customer.url || '',
      phone: customer.phone || '',
      sasuke_id: customer.sasuke_id || '',
    });
    setEditingCustomer(true);
  };

  const handleCustomerSave = async () => {
    await fetch(`${API}/customers/${customerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerForm),
    });
    setEditingCustomer(false);
    load();
  };

  const handleEditStart = (d) => {
    setEditId(d.id);
    setEditForm({ title: d.title, amount: d.amount || '', status: d.status, inspection_date: d.inspection_date || '', topics: d.topics || '' });
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

  if (!customer) return <div>読み込み中...</div>;

  const ACTUAL_STATUSES = new Set(['won', 'done', 'monthly', 'shikakake']);
  const totalAmount = deals.filter(d => ACTUAL_STATUSES.has(d.status)).reduce((sum, d) => sum + d.amount, 0);
  const fullAddress = [customer.postal_code ? `〒${customer.postal_code}` : null, customer.prefecture, customer.address, customer.building]
    .filter(Boolean).join(' ') || '-';

  const currentIdx = customerIds.indexOf(customerId);
  const prevId = currentIdx > 0 ? customerIds[currentIdx - 1] : null;
  const nextId = currentIdx >= 0 && currentIdx < customerIds.length - 1 ? customerIds[currentIdx + 1] : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <button className="btn-back" onClick={onBack}>← 顧客一覧に戻る</button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => prevId && onNavigate(prevId)} disabled={!prevId} style={{ padding: '6px 14px', background: prevId ? '#1a2540' : '#111827', border: '1px solid #2a3a58', color: prevId ? '#c9d1e8' : '#3a4a6a', borderRadius: '6px', cursor: prevId ? 'pointer' : 'default', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>← 前の顧客</button>
          <button onClick={() => nextId && onNavigate(nextId)} disabled={!nextId} style={{ padding: '6px 14px', background: nextId ? '#1a2540' : '#111827', border: '1px solid #2a3a58', color: nextId ? '#c9d1e8' : '#3a4a6a', borderRadius: '6px', cursor: nextId ? 'pointer' : 'default', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>次の顧客 →</button>
        </div>
      </div>

      <h2>{customer.company}</h2>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>基本情報</h3>
          {!editingCustomer && <button className="btn-edit" onClick={handleCustomerEditStart}>編集</button>}
        </div>
        <div>
          {editingCustomer ? (
            <>
              <table className="detail-table">
                <tbody>
                  <tr><th>会社名</th><td><input value={customerForm.company} onChange={e => setCustomerForm({...customerForm, company: e.target.value})} style={{ width: '100%' }} /></td></tr>
                  <tr><th>郵便番号</th><td><input value={customerForm.postal_code} onChange={e => setCustomerForm({...customerForm, postal_code: e.target.value})} style={{ width: '100%' }} /></td></tr>
                  <tr><th>都道府県</th><td><input value={customerForm.prefecture} onChange={e => setCustomerForm({...customerForm, prefecture: e.target.value})} style={{ width: '100%' }} /></td></tr>
                  <tr><th>住所</th><td><input value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} style={{ width: '100%' }} /></td></tr>
                  <tr><th>建物名</th><td><input value={customerForm.building} onChange={e => setCustomerForm({...customerForm, building: e.target.value})} style={{ width: '100%' }} /></td></tr>
                  <tr><th>URL</th><td><input value={customerForm.url} onChange={e => setCustomerForm({...customerForm, url: e.target.value})} style={{ width: '100%' }} /></td></tr>
                  <tr><th>サスケ顧客番号</th><td><input value={customerForm.sasuke_id} onChange={e => setCustomerForm({...customerForm, sasuke_id: e.target.value})} style={{ width: '100%' }} /></td></tr>
                </tbody>
              </table>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button className="btn-edit" onClick={handleCustomerSave}>保存</button>
                <button className="btn-delete" onClick={() => setEditingCustomer(false)}>キャンセル</button>
              </div>
            </>
          ) : (
            <table className="detail-table">
              <tbody>
                <tr><th>会社名</th><td>{customer.company || '-'}</td></tr>
                <tr><th>郵便番号</th><td>{customer.postal_code || '-'}</td></tr>
                <tr><th>都道府県</th><td>{customer.prefecture || '-'}</td></tr>
                <tr><th>住所</th><td>{customer.address || '-'}</td></tr>
                <tr><th>建物名</th><td>{customer.building || '-'}</td></tr>
                <tr><th>URL</th><td>{customer.url ? <a href={customer.url} target="_blank" rel="noreferrer" style={{color:'#00d4ff'}}>{customer.url}</a> : '-'}</td></tr>
                <tr><th>サスケ顧客番号</th><td>{customer.sasuke_id || '-'}</td></tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>運用サービス</h3>
          {!editingService && <button className="btn-edit" onClick={() => setEditingService(true)}>編集</button>}
        </div>
        {systems.length === 0 && !editingService && (
          <div style={{ fontSize: '13px', color: 'var(--text-faint)' }}>登録なし</div>
        )}
        {systems.length > 0 && (
          <table style={{ marginBottom: editingService ? '16px' : 0, tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: '280px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '120px' }} />
              <col />
              {editingService && <col style={{ width: '120px' }} />}
            </colgroup>
            <thead>
              <tr><th>サービス名</th><th>サービス開始日</th><th>SI担当者</th><th>説明</th>{editingService && <th></th>}</tr>
            </thead>
            <tbody>
              {systems.map(s => editSystemId === s.id ? (
                <tr key={s.id}>
                  <td><input value={editSystemForm.name} onChange={e => setEditSystemForm({...editSystemForm, name: e.target.value})} style={{ width: '100%' }} /></td>
                  <td><input type="date" value={editSystemForm.start_date || ''} onChange={e => setEditSystemForm({...editSystemForm, start_date: e.target.value})} style={{ width: '100%' }} /></td>
                  <td><input value={editSystemForm.assignee || ''} onChange={e => setEditSystemForm({...editSystemForm, assignee: e.target.value})} style={{ width: '100%' }} /></td>
                  <td><textarea value={editSystemForm.description || ''} onChange={e => setEditSystemForm({...editSystemForm, description: e.target.value})} rows={3} style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: '13px' }} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn-edit" onClick={() => handleEditSystem(s.id)}>保存</button>
                    <button className="btn-delete" onClick={() => setEditSystemId(null)}>キャンセル</button>
                  </td>
                </tr>
              ) : (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.start_date || '-'}</td>
                  <td>{s.assignee || '-'}</td>
                  <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{s.description || '-'}</td>
                  {editingService && (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn-edit" onClick={() => { setEditSystemId(s.id); setEditSystemForm({ name: s.name, start_date: s.start_date || '', description: s.description || '', assignee: s.assignee || '' }); }}>編集</button>
                      <button className="btn-delete" onClick={() => handleDeleteSystem(s.id)}>削除</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {editingService && (
          <>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
              <input
                placeholder="サービス名 *"
                value={newSystem.name}
                onChange={e => setNewSystem({...newSystem, name: e.target.value})}
                style={{ flex: 2, fontSize: '13px' }}
              />
              <input
                type="date"
                value={newSystem.start_date}
                onChange={e => setNewSystem({...newSystem, start_date: e.target.value})}
                style={{ flex: 1, fontSize: '13px' }}
              />
              <input
                placeholder="SI担当者"
                value={newSystem.assignee}
                onChange={e => setNewSystem({...newSystem, assignee: e.target.value})}
                style={{ flex: 1, fontSize: '13px' }}
              />
              <textarea
                placeholder="説明"
                value={newSystem.description}
                onChange={e => setNewSystem({...newSystem, description: e.target.value})}
                rows={2}
                style={{ flex: 3, fontSize: '13px', resize: 'vertical', fontFamily: 'inherit' }}
              />
              <button
                onClick={handleAddSystem}
                style={{ padding: '6px 16px', background: 'var(--accent)', border: 'none', borderRadius: '6px', color: 'var(--bg-inner)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
              >追加</button>
            </div>
            <button
              className="btn-delete"
              onClick={() => { setEditingService(false); setEditSystemId(null); setNewSystem({ name: '', start_date: '', description: '', assignee: '' }); }}
            >完了</button>
          </>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>取引一覧</h3>
          <span style={{ fontSize: '13px', color: '#6b7fa3' }}>受注合計：<strong style={{ color: '#00d4ff' }}>¥{totalAmount.toLocaleString()}</strong></span>
        </div>
        <table>
          <thead>
            <tr><th>案件名</th><th>金額</th><th>ステータス</th><th>検収月</th><th></th></tr>
          </thead>
          <tbody>
            {deals.map(d => editId === d.id ? (
              <tr key={d.id}>
                <td><input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} style={{ width: '100%' }} /></td>
                <td><input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} style={{ width: '100%' }} /></td>
                <td>
                  <select className="status-select" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} style={STATUS_COLORS[editForm.status] ? { color: STATUS_COLORS[editForm.status] } : {}}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </td>
                <td>
                  <select value={editForm.inspection_date} onChange={e => setEditForm({...editForm, inspection_date: e.target.value})}>
                    <option value=""></option>
                    {INSPECTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn-edit" onClick={() => handleEditSave(d.id)}>保存</button>
                  <button className="btn-delete" onClick={() => setEditId(null)}>キャンセル</button>
                </td>
              </tr>
            ) : (
              <tr key={d.id}>
                <td>{d.title}</td>
                <td>{d.amount ? `¥${Number(d.amount).toLocaleString()}` : '-'}</td>
                <td>
                  <select
                    className="status-select"
                    value={d.status}
                    onChange={e => handleStatusChange(d.id, e.target.value)}
                    style={STATUS_COLORS[d.status] ? { color: STATUS_COLORS[d.status] } : {}}
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </td>
                <td>{d.inspection_date || '-'}</td>
                <td><button className="btn-edit" onClick={() => handleEditStart(d)}>編集</button></td>
              </tr>
            ))}
            {deals.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#4a5f82' }}>案件がありません</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
