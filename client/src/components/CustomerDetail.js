import { useEffect, useState } from 'react';

const API = 'http://localhost:3001';

const formatPhone = (phone) => {
  if (!phone) return '-';
  const n = phone.replace(/\D/g, '');
  if (n.length === 11) return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
  if (n.length === 10) return `${n.slice(0,3)}-${n.slice(3,6)}-${n.slice(6)}`;
  return phone;
};

const STATUS_LABELS = { proposing: '提案中', planned: '提案予定', won: '受注', developing: '開発中', monthly: '月額', done: '完了', forecast: '見込' };

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
  const fullAddress = [customer.postal_code ? `〒${customer.postal_code}` : null, customer.prefecture, customer.address, customer.building]
    .filter(Boolean).join(' ') || '-';

  return (
    <div>
      <h2>顧客詳細</h2>
      <button className="btn-back" onClick={onBack}>← 顧客一覧に戻る</button>

      <h2>{customer.company}</h2>

      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>基本情報</h3>
        <table className="detail-table">
          <tbody>
            <tr><th>会社名</th><td>{customer.company || '-'}</td></tr>
            <tr><th>郵便番号</th><td>{customer.postal_code || '-'}</td></tr>
            <tr><th>都道府県</th><td>{customer.prefecture || '-'}</td></tr>
            <tr><th>住所</th><td>{customer.address || '-'}</td></tr>
            <tr><th>建物名</th><td>{customer.building || '-'}</td></tr>
            <tr><th>URL</th><td>{customer.url ? <a href={customer.url} target="_blank" rel="noreferrer" style={{color:'#00d4ff'}}>{customer.url}</a> : '-'}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>案件一覧</h3>
          <span style={{ fontSize: '13px', color: '#6b7fa3' }}>受注合計：<strong style={{ color: '#00d4ff' }}>¥{totalAmount.toLocaleString()}</strong></span>
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
            {deals.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#4a5f82' }}>案件がありません</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
