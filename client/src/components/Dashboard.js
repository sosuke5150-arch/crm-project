import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const API = 'http://localhost:3001';

const MONTH_ORDER = ['9月検収','10月検収','11月検収','12月検収','1月検収','2月検収','3月検収','4月検収','5月検収','6月検収','7月検収','8月検収'];
const MONTH_LABEL = m => m.replace('検収', '');
const PIE_COLORS = ['#00d4ff','#e879f9','#84cc16','#f59e0b','#f43f5e','#38bdf8','#34d399','#fb923c','#a78bfa','#2dd4bf','#facc15','#ec4899'];

const tooltipStyle = { background: '#0d1120', border: '1px solid #1e2a45', borderRadius: 6, padding: '10px 16px' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={tooltipStyle}>
      <p style={{ color: '#6b7fa3', fontSize: 12, marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontWeight: 700, fontSize: 13 }}>
          {p.name}：¥{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [summary, setSummary] = useState({ customerCount: 0, dealCount: 0, totalAmount: 0, openDeals: 0 });
  const [monthlyData, setMonthlyData] = useState([]);
  const [yojitsuData, setYojitsuData] = useState([]);
  const [customerData, setCustomerData] = useState([]);

  useEffect(() => {
    fetch(`${API}/summary`).then(r => r.json()).then(setSummary).catch(() => {});

    fetch(`${API}/summary/by-month`).then(r => r.json()).then(rows => {
      const sorted = MONTH_ORDER
        .map(m => ({ month: MONTH_LABEL(m), total: rows.find(r => r.month === m)?.total || 0 }))
        .filter(d => d.total > 0);
      setMonthlyData(sorted);
    }).catch(() => {});

    fetch(`${API}/summary/by-customer`).then(r => r.json()).then(setCustomerData).catch(() => {});

    fetch(`${API}/summary/yojitsu`).then(r => r.json()).then(({ actuals, targets }) => {
      const data = MONTH_ORDER.map(m => {
        const label = MONTH_LABEL(m);
        const actual = actuals.find(r => r.month === m)?.total || 0;
        const target = targets.find(r => r.month === label)?.total || 0;
        return { month: label, 実績: actual, 目標: target };
      }).filter(d => d.実績 > 0 || d.目標 > 0);
      setYojitsuData(data);
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
          <p style={{ color: '#4a5f82', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>データがありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a45" />
              <XAxis dataKey="month" tick={{ fill: '#6b7fa3', fontSize: 12 }} axisLine={{ stroke: '#1e2a45' }} tickLine={false} />
              <YAxis tickFormatter={v => `¥${(v/10000).toFixed(0)}万`} tick={{ fill: '#6b7fa3', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,212,255,0.05)' }} />
              <Bar dataKey="total" name="売上" fill="#00d4ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>顧客別 取引金額</h3>
        {customerData.length === 0 ? (
          <p style={{ color: '#4a5f82', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>データがありません</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <ResponsiveContainer width="50%" height={280}>
              <PieChart>
                <Pie data={customerData} dataKey="total" nameKey="customer" cx="50%" cy="50%" outerRadius={110} innerRadius={50}>
                  {customerData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `¥${Number(v).toLocaleString()}`} contentStyle={tooltipStyle} labelStyle={{ color: '#6b7fa3' }} itemStyle={{ color: '#00d4ff' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 280, overflowY: 'auto' }}>
              {customerData.map((d, i) => (
                <div key={d.customer} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                  <span style={{ color: '#a8b6d0', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.customer}</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap' }}>¥{Number(d.total).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>月別 予実比較</h3>
        {yojitsuData.length === 0 ? (
          <p style={{ color: '#4a5f82', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>データがありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={yojitsuData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a45" />
              <XAxis dataKey="month" tick={{ fill: '#6b7fa3', fontSize: 12 }} axisLine={{ stroke: '#1e2a45' }} tickLine={false} />
              <YAxis tickFormatter={v => `¥${(v/10000).toFixed(0)}万`} tick={{ fill: '#6b7fa3', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend wrapperStyle={{ color: '#6b7fa3', fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="目標" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="実績" fill="#00d4ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
