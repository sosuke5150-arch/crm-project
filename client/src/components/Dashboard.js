import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, ReferenceLine, LabelList } from 'recharts';

const API = 'http://localhost:3001';

const MONTH_ORDER = ['9月検収','10月検収','11月検収','12月検収','1月検収','2月検収','3月検収','4月検収','5月検収','6月検収','7月検収','8月検収'];
const UPPER_MONTHS = ['9月','10月','11月','12月','1月','2月'];
const LOWER_MONTHS = ['3月','4月','5月','6月','7月','8月'];
const Q1_MONTHS = ['9月','10月','11月'];
const Q2_MONTHS = ['12月','1月','2月'];
const Q3_MONTHS = ['3月','4月','5月'];
const Q4_MONTHS = ['6月','7月','8月'];
const ACTUAL_STS = new Set(['won','done','monthly','shikakake']);
const FORECAST_STS = new Set(['forecast','developing','proposing','waiting']);
const MONTH_LABEL = m => m.replace('検収', '');

const PIE_COLORS_MAP = {
  dark:  ['#6366f1','#e879f9','#84cc16','#f59e0b','#f43f5e','#38bdf8','#34d399','#fb923c','#a78bfa','#2dd4bf','#facc15','#ec4899'],
  cyber: ['#00eaff','#ff6eb0','#7c5cfc','#20e8a0','#ffcc00','#ff3d5a','#a78bfa','#ff9f45','#00d4aa','#e879f9','#44eeff','#ffdd44'],
  excel: ['#9b59b6','#27ae60','#a9d18e','#ffc000','#e15f5f','#70ad47','#5b9bd5','#c55a11','#7030a0','#2e75b6','#843c0c','#bf9000'],
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
  const [summary, setSummary] = useState({ customerCount: 0, dealCount: 0, doneCount: 0, forecastCount: 0, proposingCount: 0, waitingCount: 0, totalAmount: 0, totalForecast: 0, totalTarget: 0 });
  const [monthlyData, setMonthlyData] = useState([]);
  const [yojitsuData, setYojitsuData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [periodData, setPeriodData] = useState([]);
  const [monthlyPieData, setMonthlyPieData] = useState([]);
  const [quarterData, setQuarterData] = useState([]);

  const theme = document.body.dataset.theme || 'dark';
  const colors = getChartColors();
  const PIE_COLORS = PIE_COLORS_MAP[theme] || PIE_COLORS_MAP.dark;
  const isLight = theme === 'excel' || theme === 'earth';
  const isCyber = theme === 'cyber';
  const cursorFill = isLight ? 'rgba(0,0,0,0.04)' : isCyber ? 'rgba(0,234,255,0.06)' : 'rgba(255,255,255,0.03)';
  const headingStyle = isLight
    ? { fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }
    : isCyber
      ? { fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'linear-gradient(90deg, #00eaff, #ff6eb0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 8px rgba(0,234,255,0.4))' }
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

      const uBudget   = sumTgt(UPPER_MONTHS);
      const uActual   = sumAct(UPPER_MONTHS);
      const uForecast = sumFore(UPPER_MONTHS);
      const lBudget   = sumTgt(LOWER_MONTHS);
      const lActual   = sumAct(LOWER_MONTHS);
      const lForecast = sumFore(LOWER_MONTHS);

      setPeriodData([
        { name: '上期', 予算: uBudget, 実績: uActual, 見込: uForecast },
        { name: '下期', 予算: lBudget, 実績: lActual, 見込: lForecast },
        { name: '通期', 予算: uBudget + lBudget, 実績: uActual + lActual, 見込: uForecast + lForecast },
      ]);

      setQuarterData([
        { name: 'Q1（9-11月）', 予算: sumTgt(Q1_MONTHS), 実績: sumAct(Q1_MONTHS), 見込: sumFore(Q1_MONTHS) },
        { name: 'Q2（12-2月）', 予算: sumTgt(Q2_MONTHS), 実績: sumAct(Q2_MONTHS), 見込: sumFore(Q2_MONTHS) },
        { name: 'Q3（3-5月）',  予算: sumTgt(Q3_MONTHS), 実績: sumAct(Q3_MONTHS), 見込: sumFore(Q3_MONTHS) },
        { name: 'Q4（6-8月）',  予算: sumTgt(Q4_MONTHS), 実績: sumAct(Q4_MONTHS), 見込: sumFore(Q4_MONTHS) },
      ]);

      // 月別予実円グラフ用データ
      const monthlyPie = MONTH_LABELS.map(m => {
        const actual   = actMap[m]  || 0;
        const forecast = foreMap[m] || 0;
        const target   = tgtMap[m]  || 0;
        const total    = actual + forecast;
        const diff     = total - target;
        const rate     = target > 0 ? Math.round(total / target * 100) : null;
        const noData   = target === 0 && total === 0;
        let pieData;
        if (noData) {
          pieData = [{ name: '無データ', value: 1 }];
        } else if (target === 0 || total >= target) {
          pieData = [
            ...(actual   > 0 ? [{ name: '実績', value: actual   }] : []),
            ...(forecast > 0 ? [{ name: '見込', value: forecast }] : []),
          ];
        } else {
          pieData = [
            ...(actual   > 0 ? [{ name: '実績', value: actual   }] : []),
            ...(forecast > 0 ? [{ name: '見込', value: forecast }] : []),
            { name: '残', value: target - total },
          ];
        }
        // 顧客別構成（外側リング用）
        const custMap = {};
        deals.forEach(d => {
          if (toM(d.inspection_date) !== m) return;
          if (!ACTUAL_STS.has(d.status) && !FORECAST_STS.has(d.status)) return;
          const name = d.customer_name || '不明';
          custMap[name] = (custMap[name] || 0) + (Number(d.amount) || 0);
        });
        const customerBreakdown = Object.entries(custMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
        return { month: m, actual, forecast, target, total, diff, rate, pieData, noData, customerBreakdown };
      });
      setMonthlyPieData(monthlyPie);
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
          <div className="stat-label">受注待ち</div>
          <div className="stat-value">{summary.waitingCount}</div>
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
          <div className="stat-value">{(() => { const t = periodData.find(d => d.name === '通期'); return t ? (t.実績 + t.見込).toLocaleString() : '-'; })()}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>月別 予実比較</h3>
        {yojitsuData.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>データがありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={yojitsuData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
              {isCyber && (
                <defs>
                  <linearGradient id="cg1Target" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.85}/>
                    <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0.18}/>
                  </linearGradient>
                  <linearGradient id="cg1Actual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00eaff" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#00eaff" stopOpacity={0.18}/>
                  </linearGradient>
                  <linearGradient id="cg1Forecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff6eb0" stopOpacity={0.85}/>
                    <stop offset="95%" stopColor="#ff6eb0" stopOpacity={0.18}/>
                  </linearGradient>
                </defs>
              )}
              <CartesianGrid strokeDasharray="3 3" stroke={isCyber ? 'rgba(0,234,255,0.1)' : 'var(--border)'} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={{ stroke: isCyber ? 'rgba(0,234,255,0.15)' : 'var(--border)' }} tickLine={false} />
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
              <Bar dataKey="目標" name="目標" fill={isCyber ? 'url(#cg1Target)' : colors.target} radius={[4, 4, 0, 0]} />
              <Bar dataKey="bar2" name="実績" radius={[4, 4, 0, 0]} fillOpacity={isCyber ? 0.8 : 1}>
                {yojitsuData.map((d, i) => <Cell key={i} fill={d._hasActual ? colors.actual : colors.forecast} />)}
              </Bar>
              <Bar dataKey="bar3" name="見込" fill={isCyber ? 'url(#cg1Forecast)' : colors.forecast} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>月別 予実比較（円グラフ）</h3>
        {monthlyPieData.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>データがありません</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
              {monthlyPieData.map((d, mi) => {
                const diffColor = d.diff > 0 ? colors.gain : d.diff < 0 ? colors.loss : 'var(--text-muted)';
                const rateColor = d.rate === null ? 'var(--text-faint)' : d.rate >= 100 ? colors.gain : d.rate >= 80 ? colors.warn : colors.loss;
                const segColor = name => {
                  if (isCyber) return ({
                    '実績':   `url(#pia${mi})`,
                    '見込':   `url(#pif${mi})`,
                    '残':     'rgba(0,234,255,0.13)',
                    '無データ': 'rgba(0,234,255,0.05)',
                  })[name] || '#888';
                  return ({
                    '実績':   colors.actual,
                    '見込':   colors.forecast,
                    '残':     isLight ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.40)',
                    '無データ': isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)',
                  })[name] || '#888';
                };
                return (
                  <div key={d.month} style={{
                    background: isCyber ? 'rgba(4,6,9,0.85)' : 'var(--bg-inner)',
                    border: `1px solid ${isCyber ? 'rgba(0,234,255,0.22)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '12px 8px 10px', textAlign: 'center',
                    ...(isCyber && { boxShadow: '0 0 16px rgba(0,234,255,0.07), inset 0 0 30px rgba(0,234,255,0.02)' }),
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isCyber ? colors.actual : 'var(--text-muted)', marginBottom: 6, ...(isCyber && { textShadow: '0 0 10px rgba(0,234,255,0.6)' }) }}>{d.month}</div>
                    <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto' }}>
                      <PieChart width={120} height={120}>
                        {isCyber && (
                          <defs>
                            <linearGradient id={`pia${mi}`} x1="1" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#44eeff" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#006688" stopOpacity={0.75}/>
                            </linearGradient>
                            <linearGradient id={`pif${mi}`} x1="1" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ff88cc" stopOpacity={1}/>
                              <stop offset="100%" stopColor="#bb1166" stopOpacity={0.75}/>
                            </linearGradient>
                          </defs>
                        )}
                        <Pie data={d.pieData} dataKey="value" cx="50%" cy="50%" innerRadius={26} outerRadius={40} strokeWidth={0} startAngle={90} endAngle={-270}>
                          {d.pieData.map((seg, i) => <Cell key={i} fill={segColor(seg.name)} />)}
                        </Pie>
                        {(d.customerBreakdown?.length > 0) && (
                          <Pie data={d.customerBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={43} outerRadius={57} strokeWidth={isCyber ? 0.5 : 1} stroke={isCyber ? 'rgba(0,234,255,0.15)' : 'var(--bg-inner)'} startAngle={90} endAngle={-270}>
                            {d.customerBreakdown.map((seg, i) => {
                              const idx = customerData.findIndex(c => c.customer === seg.name);
                              return <Cell key={i} fill={PIE_COLORS[(idx >= 0 ? idx : i) % PIE_COLORS.length]} />;
                            })}
                          </Pie>
                        )}
                        <Tooltip
                          formatter={(v, n) => [`¥${Number(v).toLocaleString()}`, n]}
                          contentStyle={{ ...tooltipStyle, fontSize: 12, padding: '6px 10px' }}
                          wrapperStyle={{ zIndex: 999 }}
                        />
                      </PieChart>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 13, fontWeight: 700, color: rateColor, pointerEvents: 'none', whiteSpace: 'nowrap', ...(isCyber && { textShadow: `0 0 12px ${rateColor}cc` }) }}>
                        {d.rate !== null ? `${d.rate}%` : '—'}
                      </div>
                    </div>
                    {!d.noData && d.target > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 5 }}>
                        予算 ¥{d.target.toLocaleString()}
                      </div>
                    )}
                    {!d.noData && d.actual > 0 && (
                      <div style={{ fontSize: 12, color: colors.actual, marginTop: 3, ...(isCyber && { textShadow: '0 0 8px rgba(0,234,255,0.5)' }) }}>
                        実績 ¥{d.actual.toLocaleString()}
                      </div>
                    )}
                    {!d.noData && d.forecast > 0 && (
                      <div style={{ fontSize: 12, color: colors.forecast, marginTop: 3, ...(isCyber && { textShadow: '0 0 8px rgba(255,110,176,0.5)' }) }}>
                        見込 ¥{d.forecast.toLocaleString()}
                      </div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 700, color: d.noData ? 'var(--text-faint)' : diffColor, marginTop: 5, borderTop: d.noData ? 'none' : `1px solid ${isCyber ? 'rgba(0,234,255,0.15)' : 'var(--border)'}`, paddingTop: d.noData ? 0 : 5, ...(isCyber && !d.noData && { textShadow: `0 0 10px ${diffColor}aa` }) }}>
                      {d.noData
                        ? 'データなし'
                        : d.target === 0
                          ? `¥${(d.total / 10000).toFixed(0)}万`
                          : `${d.diff >= 0 ? '+' : ''}¥${Math.round(d.diff).toLocaleString()}`}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '14px' }}>
              {[{ label: '実績', color: colors.actual }, { label: '見込', color: colors.forecast }, { label: '残', color: isLight ? 'rgba(0,0,0,0.45)' : isCyber ? 'rgba(0,234,255,0.22)' : 'rgba(255,255,255,0.45)' }].map(i => (
                <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: i.color }} />
                  {i.label}
                </div>
              ))}
            </div>

            {/* 売上構成 */}
            {customerData.length > 0 && (() => {
              const total = customerData.reduce((s, d) => s + Number(d.total), 0);
              // 顧客別: 実績+見込合計が大きい順に表示（その他にまとめる閾値なし）
              return (
                <div style={{ marginTop: '28px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isCyber ? colors.actual : 'var(--text-muted)', marginBottom: '16px', letterSpacing: '0.08em', ...(isCyber && { textShadow: '0 0 10px rgba(0,234,255,0.5)' }) }}>確定売上構成（顧客別）</div>
                  <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                    <div style={{ flexShrink: 0, ...(isCyber && { filter: 'drop-shadow(0 0 10px rgba(0,234,255,0.3))' }) }}>
                      <PieChart width={200} height={200}>
                        <Pie data={customerData} dataKey="total" nameKey="customer" cx="50%" cy="50%" outerRadius={90} innerRadius={48} strokeWidth={isCyber ? 1 : 0} stroke={isCyber ? 'rgba(4,6,9,0.7)' : 'none'} startAngle={90} endAngle={-270}>
                          {customerData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div style={tooltipStyle}>
                                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4, fontWeight: 700 }}>{d.customer}</p>
                                <p style={{ color: 'var(--text-heading)', fontWeight: 700, fontSize: 13 }}>¥{Number(d.total).toLocaleString()}</p>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {customerData.map((d, i) => {
                        const pct = total > 0 ? (Number(d.total) / total * 100).toFixed(1) : '0.0';
                        const barW = total > 0 ? (Number(d.total) / total * 100) : 0;
                        return (
                          <div key={d.customer} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                            <span style={{ color: 'var(--text-td)', width: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>{d.customer}</span>
                            <div style={{ flex: 1, background: isLight ? 'rgba(0,0,0,0.06)' : isCyber ? 'rgba(0,234,255,0.08)' : 'rgba(255,255,255,0.05)', borderRadius: 4, height: isCyber ? 7 : 6, overflow: 'hidden' }}>
                              <div style={{ width: `${barW}%`, height: '100%', background: isCyber ? `linear-gradient(90deg, ${PIE_COLORS[i % PIE_COLORS.length]}, ${PIE_COLORS[(i + 3) % PIE_COLORS.length]}88)` : PIE_COLORS[i % PIE_COLORS.length], borderRadius: 4, ...(isCyber && { boxShadow: `0 0 8px ${PIE_COLORS[i % PIE_COLORS.length]}bb` }) }} />
                            </div>
                            <span style={{ color: 'var(--text-muted)', width: 36, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                            <span style={{ color: 'var(--text-heading)', fontWeight: 600, width: 110, textAlign: 'right', flexShrink: 0 }}>¥{Number(d.total).toLocaleString()}</span>
                          </div>
                        );
                      })}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 12, borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '2px' }}>
                        <div style={{ width: 8, height: 8, flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-muted)', width: 160, flexShrink: 0, fontWeight: 700 }}>合計</span>
                        <div style={{ flex: 1 }} />
                        <span style={{ color: 'var(--text-muted)', width: 36 }} />
                        <span style={{ color: 'var(--text-heading)', fontWeight: 700, width: 110, textAlign: 'right', flexShrink: 0 }}>¥{total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>四半期　予実対比</h3>
        {quarterData.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>データがありません</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quarterData} margin={{ top: 16, right: 24, left: 16, bottom: 4 }} barCategoryGap="30%">
                {isCyber && (
                  <defs>
                    <linearGradient id="cg3Target" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.85}/>
                      <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0.18}/>
                    </linearGradient>
                    <linearGradient id="cg3Actual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00eaff" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#00eaff" stopOpacity={0.18}/>
                    </linearGradient>
                    <linearGradient id="cg3Forecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff6eb0" stopOpacity={0.85}/>
                      <stop offset="95%" stopColor="#ff6eb0" stopOpacity={0.18}/>
                    </linearGradient>
                  </defs>
                )}
                <CartesianGrid strokeDasharray="3 3" stroke={isCyber ? 'rgba(0,234,255,0.1)' : 'var(--border)'} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-body)', fontSize: 13, fontWeight: 600 }} axisLine={{ stroke: isCyber ? 'rgba(0,234,255,0.15)' : 'var(--border)' }} tickLine={false} />
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
                <Bar dataKey="予算" fill={isCyber ? 'url(#cg3Target)' : colors.target} radius={[4, 4, 0, 0]} />
                <Bar dataKey="実績" fill={isCyber ? 'url(#cg3Actual)' : colors.actual} radius={[4, 4, 0, 0]} />
                <Bar dataKey="見込" fill={isCyber ? 'url(#cg3Forecast)' : colors.forecast} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {quarterData.map(d => {
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
        <h3 style={{ marginBottom: '20px' }}>上期・下期・通期　予実対比</h3>
        {periodData.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>データがありません</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={periodData} margin={{ top: 16, right: 24, left: 16, bottom: 4 }} barCategoryGap="30%">
                {isCyber && (
                  <defs>
                    <linearGradient id="cg2Target" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c5cfc" stopOpacity={0.85}/>
                      <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0.18}/>
                    </linearGradient>
                    <linearGradient id="cg2Actual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00eaff" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#00eaff" stopOpacity={0.18}/>
                    </linearGradient>
                    <linearGradient id="cg2Forecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff6eb0" stopOpacity={0.85}/>
                      <stop offset="95%" stopColor="#ff6eb0" stopOpacity={0.18}/>
                    </linearGradient>
                  </defs>
                )}
                <CartesianGrid strokeDasharray="3 3" stroke={isCyber ? 'rgba(0,234,255,0.1)' : 'var(--border)'} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-body)', fontSize: 13, fontWeight: 600 }} axisLine={{ stroke: isCyber ? 'rgba(0,234,255,0.15)' : 'var(--border)' }} tickLine={false} />
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
                <Bar dataKey="予算" fill={isCyber ? 'url(#cg2Target)' : colors.target} radius={[4, 4, 0, 0]} />
                <Bar dataKey="実績" fill={isCyber ? 'url(#cg2Actual)' : colors.actual} radius={[4, 4, 0, 0]} />
                <Bar dataKey="見込" fill={isCyber ? 'url(#cg2Forecast)' : colors.forecast} radius={[4, 4, 0, 0]} />
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

    </div>
  );
}
