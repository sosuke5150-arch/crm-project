import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const API = 'http://localhost:3001';

const MONTH_ORDER = ['9月検収','10月検収','11月検収','12月検収','1月検収','2月検収','3月検収','4月検収','5月検収','6月検収','7月検収','8月検収'];
const MONTH_LABEL = m => m.replace('検収', '');
const PIE_COLORS = ['#00d4ff','#e879f9','#84cc16','#f59e0b','#f43f5e','#38bdf8','#34d399','#fb923c','#a78bfa','#2dd4bf','#facc15','#ec4899'];

const tooltipStyle = { background: '#0d1120', border: '1px solid #1e2a45', borderRadius: 6, padding: '10px 16px' };

const YojitsuTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const actual = d._hasActual ? d.bar2 : 0;
  const forecast = d._hasActual ? d.bar3 : d.bar2;
  const items = [
    { name: '目標', value: d.目標, color: '#3b82f6' },
    { name: '実績', value: actual, color: '#00d4ff' },
    { name: '見込', value: forecast, color: '#fb923c' },
  ].filter(i => i.value > 0);
  return (
    <div style={tooltipStyle}>
      <p style={{ color: '#6b7fa3', fontSize: 12, marginBottom: 6 }}>{label}</p>
      {items.map(i => (
        <p key={i.name} style={{ color: i.color, fontWeight: 700, fontSize: 13 }}>
          {i.name}：¥{Number(i.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={tooltipStyle}>
      <p style={{ color: '#6b7fa3', fontSize: 12, marginBottom: 6 }}>{label}</p>
      {payload.filter(p => p.value > 0).map(p => (
        <p key={p.name} style={{ color: p.color, fontWeight: 700, fontSize: 13 }}>
          {p.name}：¥{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [summary, setSummary] = useState({ customerCount: 0, dealCount: 0, doneCount: 0, forecastCount: 0, proposingCount: 0, totalAmount: 0, totalForecast: 0, totalTarget: 0 });
  const [monthlyData, setMonthlyData] = useState([]);
  const [yojitsuData, setYojitsuData] = useState([]);
  const [customerData, setCustomerData] = useState([]);

  useEffect(() => {
    fetch(`${API}/summary`).then(r => r.json()).then(setSummary).catch(() => {});

    fetch(`${API}/summary/by-month`).then(r => r.json()).then(rows => {
      const sorted = MONTH_ORDER
        .map(m => {
          const r = rows.find(r => r.month === m);
          return { month: MONTH_LABEL(m), 実績: r?.actual || 0, 見込: r?.forecast || 0 };
        })
        .filter(d => d.実績 > 0 || d.見込 > 0);
      setMonthlyData(sorted);
    }).catch(() => {});

    fetch(`${API}/summary/by-customer`).then(r => r.json()).then(setCustomerData).catch(() => {});

    fetch(`${API}/summary/yojitsu`).then(r => r.json()).then(({ actuals, forecasts, targets }) => {
      const data = MONTH_ORDER.map(m => {
        const label = MONTH_LABEL(m);
        const actual = actuals.find(r => r.month === m)?.total || 0;
        const forecast = (forecasts || []).find(r => r.month === m)?.total || 0;
        const target = targets.find(r => r.month === label)?.total || 0;
        return {
          month: label,
          目標: target,
          bar2: actual > 0 ? actual : forecast,
          bar3: actual > 0 ? forecast : 0,
          _hasActual: actual > 0,
        };
      }).filter(d => d.bar2 > 0 || d.目標 > 0);
      setYojitsuData(data);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'linear-gradient(90deg, #00d4ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DASHBOARD</h2>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">案件数</div>
          <div className="stat-value">{summary.dealCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">完了数</div>
          <div className="stat-value">{summary.doneCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">見込数</div>
          <div className="stat-value">{summary.forecastCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">提案中</div>
          <div className="stat-value">{summary.proposingCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">売上目標（円）</div>
          <div className="stat-value">{summary.totalTarget.toLocaleString()}</div>
        </div>
        <div className="stat">
          <div className="stat-label">確定売上額（円）</div>
          <div className="stat-value">{summary.totalAmount.toLocaleString()}</div>
        </div>
        <div className="stat">
          <div className="stat-label">着地予想額（円）</div>
          <div className="stat-value">{(summary.totalAmount + summary.totalForecast).toLocaleString()}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>月別売上額</h3>
        {monthlyData.length === 0 ? (
          <p style={{ color: '#4a5f82', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>データがありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a45" />
              <XAxis dataKey="month" tick={{ fill: '#6b7fa3', fontSize: 12 }} axisLine={{ stroke: '#1e2a45' }} tickLine={false} />
              <YAxis tickFormatter={v => `¥${(v/10000).toFixed(0)}万`} tick={{ fill: '#6b7fa3', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend wrapperStyle={{ color: '#6b7fa3', fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="実績" stackId="a" fill="#00d4ff" radius={[0, 0, 0, 0]} />
              <Bar dataKey="見込" stackId="a" fill="#fb923c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
              <Tooltip content={<YojitsuTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend content={() => (
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', paddingTop: 8 }}>
                  {[{ label: '目標', color: '#3b82f6' }, { label: '実績', color: '#00d4ff' }, { label: '見込', color: '#fb923c' }].map(i => (
                    <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7fa3' }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: i.color }} />
                      {i.label}
                    </div>
                  ))}
                </div>
              )} />
              <Bar dataKey="目標" name="目標" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="bar2" name="実績" radius={[4, 4, 0, 0]}>
                {yojitsuData.map((d, i) => <Cell key={i} fill={d._hasActual ? '#00d4ff' : '#fb923c'} />)}
              </Bar>
              <Bar dataKey="bar3" name="見込" fill="#fb923c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '20px' }}>
          <h3>顧客別 取引実績</h3>
          {customerData.length > 0 && (
            <span style={{ fontSize: 13, color: '#6b7fa3' }}>
              合計取引額：<span style={{ color: '#00d4ff', fontWeight: 700 }}>
                ¥{customerData.reduce((s, d) => s + Number(d.total), 0).toLocaleString()}
              </span>
            </span>
          )}
        </div>
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
    </div>
  );
}
