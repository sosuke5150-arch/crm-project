import { useEffect, useState } from 'react';

const API = 'http://localhost:3001';

const formatPhone = (phone) => {
  if (!phone) return '-';
  const n = phone.replace(/\D/g, '');
  if (n.length === 11) return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
  if (n.length === 10) return `${n.slice(0,3)}-${n.slice(3,6)}-${n.slice(6)}`;
  return phone;
};

const STATUS_LABELS = { open: '進行中', won: '受注', lost: '失注' };

export default function CustomerDetail({ customerId, onBack }) {
  const [customer, setCustomer] = useState(null);
  const [deals, setDeals] = useState([]);

  const load = () => {
    fetch(`${API}/customers/${customerId}`).then(r => r.json()).then(setCustomer);
    fetch(`${API}/deals?customer_id=${customerId}`).then(r => r.json()).then(setDeals);
  };

  useEffect(() => { load(); }, [customerId]);

  const handleStatusChange = async (id, status) => {
    await fetch(`${API}/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  if (!customer) return <div>読み込み中...</div>;

  const totalAmount = deals.filter(d => d.status === 'won').reduce((sum, d) => sum + d.amount, 0);

  return (
    <div>
      <button className="btn-back" onClick={onBack}>← 顧客一覧に戻る</button>

      <h2>{customer.name}</h2>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>基本情報</h3>
        <table className="detail-table">
          <tbody>
            <tr><th>会社名</th><td>{customer.company || '-'}</td></tr>
            <tr><th>メール</th><td>{customer.email || '-'}</td></tr>
            <tr><th>電話番号</th><td>{formatPhone(customer.phone)}</td></tr>
            <tr><th>登録日</th><td>{new Date(customer.created_at).toLocaleDateString('ja-JP')}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>案件一覧</h3>
          <span style={{ fontSize: '13px', color: '#888' }}>受注合計：<strong style={{ color: '#8b3a1e' }}>¥{totalAmount.toLocaleString()}</strong></span>
        </div>
        <table>
          <thead>
            <tr><th>案件名</th><th>金額</th><th>ステータス</th><th>登録日</th></tr>
          </thead>
          <tbody>
            {deals.map(d => (
              <tr key={d.id}>
                <td>{d.title}</td>
                <td>{d.amount ? `¥${Number(d.amount).toLocaleString()}` : '-'}</td>
                <td>
                  <select
                    className="status-select"
                    value={d.status}
                    onChange={e => handleStatusChange(d.id, e.target.value)}
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </td>
                <td>{new Date(d.created_at).toLocaleDateString('ja-JP')}</td>
              </tr>
            ))}
            {deals.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#aaa' }}>案件がありません</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
