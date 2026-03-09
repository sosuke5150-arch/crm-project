import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API = 'http://localhost:3001';

const MONTH_ORDER = ['9月検収','10月検収','11月検収','12月検収','1月検収','2月検収','3月検収','4月検収','5月検収','6月検収','7月検収','8月検収'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#0d1120', border: '1px solid #1e2a45', borderRadius: 6, padding: '10px 16px' }}>
        <p style={{ color: '#6b7fa3', fontSize: 12, marginBottom: 4 }}>{label}</p>
        <p style={{ color: '#00d4ff', fontWeight: 700 }}>¥{Number(payload[0].value).toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [summary, setSummary] = useState({ customerCount: 0, dealCount: 0, totalAmount: 0, openDeals: 0 });
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    fetch(`${API}/summary`).then(r => r.json()).then(setSummary).catch(() => {});
    fetch(`${API}/summary/by-month`).then(r => r.json()).then(rows => {
      const sorted = MONTH_ORDER
        .map(m => ({ month: m, total: rows.find(r => r.month === m)?.total || 0 }))
        .filter(d => d.total > 0);
      setMonthlyData(sorted);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <h2>ダッシュボード</h2>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">顧客数</div>
          <div className="stat-value">{summary.customerCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">案件数</div>
          <div className="stat-value">{summary.dealCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">進行中の案件</div>
          <div className="stat-value">{summary.openDeals}</div>
        </div>
        <div className="stat">
          <div className="stat-label">受注合計（円）</div>
          <div className="stat-value">{summary.totalAmount.toLocaleString()}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>検収月別 売上金額</h3>
        {monthlyData.length === 0 ? (
          <p style={{ color: '#4a5f82', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>検収月が設定された案件がありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a45" />
              <XAxis dataKey="month" tick={{ fill: '#6b7fa3', fontSize: 12 }} axisLine={{ stroke: '#1e2a45' }} tickLine={false} />
              <YAxis tickFormatter={v => `¥${(v/10000).toFixed(0)}万`} tick={{ fill: '#6b7fa3', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,212,255,0.05)' }} />
              <Bar dataKey="total" fill="#00d4ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
