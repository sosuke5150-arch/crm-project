import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, ReferenceLine, LabelList } from 'recharts';

const API = 'http://localhost:3001';

const MONTH_ORDER = ['9月検収','10月検収','11月検収','12月検収','1月検収','2月検収','3月検収','4月検収','5月検収','6月検収','7月検収','8月検収'];
const UPPER_MONTHS = ['9月','10月','11月','12月','1月','2月'];
const LOWER_MONTHS = ['3月','4月','5月','6月','7月','8月'];
const ACTUAL_STS = new Set(['won','done','monthly','shikakake']);
const FORECAST_STS = new Set(['forecast','developing']);
const MONTH_LABEL = m => m.replace('検収', '');

const PIE_COLORS_MAP = {
  dark:  ['#00d4ff','#e879f9','#84cc16','#f59e0b','#f43f5e','#38bdf8','#34d399','#fb923c','#a78bfa','#2dd4bf','#facc15','#ec4899'],
  excel: ['#4472c4','#ed7d31','#a9d18e','#ffc000','#e15f5f','#70ad47','#5b9bd5','#c55a11','#7030a0','#2e75b6','#843c0c','#bf9000'],
  earth: ['#b5651d','#e9a84c','#7daa6e','#c87941','#922b21','#8b6914','#d4956a','#5c8a58','#a04000','#6b8e4e','#cd853f','#556b2f'],
};

function getChartColors() {
  const s = getComputedStyle(document.body);
  const g = v => s.getPropertyValue(v).trim();
  return {
    actual:   g('--chart-actual')   || '#00d4ff',
    forecast: g('--chart-forecast') || '#fb923c',
    target:   g('--chart-target')   || '#3b82f6',
    gain:     g('--chart-gain')     || '#34d399',
    loss:     g('--chart-loss')     || '#ff4d6a',
    warn:     g('--chart-warn')     || '#facc15',
  };
}

const tooltipStyle = { background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 16px', color: 'var(--text-body)' };

const YojitsuTooltip = ({ active, payload, label, colors }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const actual = d._hasActual ? d.bar2 : 0;
  const forecast = d._hasActual ? d.bar3 : d.bar2;
  const items = [
    { name: '目標', value: d.目標, color: colors.target },
    { name: '実績', value: actual, color: colors.actual },
    { name: '見込', value: forecast, color: colors.forecast },
  ].filter(i => i.value > 0);
  return (
    <div style={tooltipStyle}>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>{label}</p>
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
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>{label}</p>
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
  const [periodData, setPeriodData] = useState([]);

  const theme = document.body.dataset.theme || 'dark';
  const colors = getChartColors();
  const PIE_COLORS = PIE_COLORS_MAP[theme] || PIE_COLORS_MAP.dark;
  const isLight = theme === 'excel' || theme === 'earth';
  const cursorFill = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)';
  const headingStyle = isLight
    ? { fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }
    : { fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'linear-gradient(90deg, #00d4ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' };

  useEffect(() => {
    fetch(`${API}/summary`).then(r => r.json()).then(setSummary).catch(() => {});

    fetch(`${API}/summary/by-customer`).then(r => r.json()).then(setCustomerData).catch(() => {});

    // deals + targets から月次データ・予実・期間対比をすべて計算
    Promise.all([
      fetch(`${API}/deals`).then(r => r.json()),
      fetch(`${API}/targets`).then(r => r.json()),
    ]).then(([deals, targetRows]) => {
      const toM = ds => (ds || '').replace('検収', '').trim();
      const MONTH_LABELS = ['9月','10月','11月','12月','1月','2月','3月','4月','5月','6月','7月','8月'];

      // 月別実績・見込を hash map で集計（substring バグなし）
      const actMap = {}, foreMap = {};
      deals.forEach(d => {
        const m = toM(d.inspection_date);
        if (!m) return;
        if (ACTUAL_STS.has(d.status))   actMap[m]  = (actMap[m]  || 0) + (Number(d.amount) || 0);
        if (FORECAST_STS.has(d.status)) foreMap[m] = (foreMap[m] || 0) + (Number(d.amount) || 0);
      });

      // 月別売上額チャート
      const sorted = MONTH_LABELS
        .map(m => ({ month: m, 実績: actMap[m] || 0, 見込: foreMap[m] || 0 }))
        .filter(d => d.実績 > 0 || d.見込 > 0);
      setMonthlyData(sorted);

      // 月別予実比較チャート
      const tgtMap = {};
      targetRows.forEach(r => { tgtMap[r.month] = (tgtMap[r.month] || 0) + (Number(r.amount) || 0); });
      const yojitsu = MONTH_LABELS.map(m => {
        const actual   = actMap[m]  || 0;
        const forecast = foreMap[m] || 0;
        const target   = tgtMap[m]  || 0;
        return { month: m, 目標: target, bar2: actual > 0 ? actual : forecast, bar3: actual > 0 ? forecast : 0, _hasActual: actual > 0 };
      }).filter(d => d.bar2 > 0 || d.目標 > 0);
      setYojitsuData(yojitsu);

      // 上期・下期・通期 予実対比
      const inPeriod = (ds, months) => months.includes(toM(ds));
      const sumAct  = months => deals.filter(d => ACTUAL_STS.has(d.status)   && inPeriod(d.inspection_date, months)).reduce((s,d) => s+(Number(d.amount)||0), 0);
      const sumFore = months => deals.filter(d => FORECAST_STS.has(d.status) && inPeriod(d.inspection_date, months)).reduce((s,d) => s+(Number(d.amount)||0), 0);
      const sumTgt  = months => targetRows.filter(r => months.includes(r.month)).reduce((s,r) => s+(Number(r.amount)||0), 0);

      const uBudget = sumTgt(UPPER_MONTHS);
      const uActual = sumAct(UPPER_MONTHS);
      const lBudget = sumTgt(LOWER_MONTHS);
      const lActual = sumAct(LOWER_MONTHS);
      const lForecast = sumFore(LOWER_MONTHS);

      setPeriodData([
        { name: '上期', 予算: uBudget, 実績: uActual, 見込: 0 },
        { name: '下期', 予算: lBudget, 実績: lActual, 見込: lForecast },
        { name: '通期', 予算: uBudget + lBudget, 実績: uActual + lActual, 見込: lForecast },
      ]);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <h2 style={headingStyle}>DASHBOARD</h2>
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
          <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>データがありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
              <YAxis tickFormatter={v => `¥${(v/10000).toFixed(0)}万`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: cursorFill }} />
              <Legend wrapperStyle={{ color: 'var(--text-muted)', fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="実績" stackId="a" fill={colors.actual} radius={[0, 0, 0, 0]} />
              <Bar dataKey="見込" stackId="a" fill={colors.forecast} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>月別 予実比較</h3>
        {yojitsuData.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>データがありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={yojitsuData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
              <YAxis tickFormatter={v => `¥${(v/10000).toFixed(0)}万`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<YojitsuTooltip colors={colors} />} cursor={{ fill: cursorFill }} />
              <Legend content={() => (
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', paddingTop: 8 }}>
                  {[{ label: '目標', color: colors.target }, { label: '実績', color: colors.actual }, { label: '見込', color: colors.forecast }].map(i => (
                    <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: i.color }} />
                      {i.label}
                    </div>
                  ))}
                </div>
              )} />
              <Bar dataKey="目標" name="目標" fill={colors.target} radius={[4, 4, 0, 0]} />
              <Bar dataKey="bar2" name="実績" radius={[4, 4, 0, 0]}>
                {yojitsuData.map((d, i) => <Cell key={i} fill={d._hasActual ? colors.actual : colors.forecast} />)}
              </Bar>
              <Bar dataKey="bar3" name="見込" fill={colors.forecast} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>上期・下期・通期　予実対比</h3>
        {periodData.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>データがありません</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={periodData} margin={{ top: 16, right: 24, left: 16, bottom: 4 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-body)', fontSize: 13, fontWeight: 600 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tickFormatter={v => `${(v/10000).toFixed(0)}万`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: cursorFill }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div style={tooltipStyle}>
                        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>{label}</p>
                        {payload.filter(p => p.value > 0).map(p => (
                          <p key={p.name} style={{ color: p.color, fontWeight: 700, fontSize: 13 }}>
                            {p.name}：¥{Number(p.value).toLocaleString()}
                          </p>
                        ))}
                        {(() => {
                          const d = payload[0]?.payload;
                          if (!d) return null;
                          const actual = d.実績 + d.見込;
                          const diff = actual - d.予算;
                          if (diff === 0) return null;
                          return (
                            <p style={{ color: diff > 0 ? colors.gain : colors.loss, fontWeight: 700, fontSize: 12, borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
                              差異：{diff > 0 ? '+' : ''}¥{diff.toLocaleString()}
                            </p>
                          );
                        })()}
                      </div>
                    );
                  }}
                />
                <Legend content={() => (
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', paddingTop: 8 }}>
                    {[{ label: '予算', color: colors.target }, { label: '実績', color: colors.actual }, { label: '見込', color: colors.forecast }].map(i => (
                      <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: i.color }} />
                        {i.label}
                      </div>
                    ))}
                  </div>
                )} />
                <Bar dataKey="予算" fill={colors.target} radius={[4, 4, 0, 0]} />
                <Bar dataKey="実績" fill={colors.actual} radius={[4, 4, 0, 0]} />
                <Bar dataKey="見込" fill={colors.forecast} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {/* 数値サマリー */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {periodData.map(d => {
                const actual = d.実績 + d.見込;
                const diff = actual - d.予算;
                const rate = d.予算 > 0 ? Math.round(actual / d.予算 * 100) : 0;
                return (
                  <div key={d.name} style={{ flex: 1, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 8, fontWeight: 600, letterSpacing: '0.08em' }}>{d.name}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>予算</span>
                        <span style={{ color: colors.target, fontWeight: 600 }}>¥{d.予算.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>実績{d.見込 > 0 ? '＋見込' : ''}</span>
                        <span style={{ color: colors.actual, fontWeight: 600 }}>¥{actual.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 2 }}>
                        <span style={{ color: 'var(--text-muted)' }}>差異</span>
                        <span style={{ color: diff > 0 ? colors.gain : diff < 0 ? colors.loss : 'var(--text-muted)', fontWeight: 700 }}>
                          {diff > 0 ? '+' : ''}¥{diff.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>達成率</span>
                        <span style={{ color: rate >= 100 ? colors.gain : rate >= 80 ? colors.warn : colors.loss, fontWeight: 700 }}>{rate}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '20px' }}>
          <h3>顧客別 取引実績</h3>
          {customerData.length > 0 && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              合計取引額：<span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                ¥{customerData.reduce((s, d) => s + Number(d.total), 0).toLocaleString()}
              </span>
            </span>
          )}
        </div>
        {customerData.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>データがありません</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <ResponsiveContainer width="50%" height={280}>
              <PieChart>
                <Pie data={customerData} dataKey="total" nameKey="customer" cx="50%" cy="50%" outerRadius={110} innerRadius={50}>
                  {customerData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `¥${Number(v).toLocaleString()}`} contentStyle={tooltipStyle} labelStyle={{ color: 'var(--text-muted)' }} itemStyle={{ color: colors.actual }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 280, overflowY: 'auto' }}>
              {customerData.map((d, i) => (
                <div key={d.customer} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-td)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.customer}</span>
                  <span style={{ color: 'var(--text-heading)', fontWeight: 600, whiteSpace: 'nowrap' }}>¥{Number(d.total).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
