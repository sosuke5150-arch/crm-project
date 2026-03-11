import { useEffect, useState } from 'react';

const API = 'http://localhost:3001';

const UPPER = ['9月','10月','11月','12月','1月','2月'];
const LOWER = ['3月','4月','5月','6月','7月','8月'];
const ALL_MONTHS = [...UPPER, ...LOWER];

const MAIN_CUSTOMERS = [
  { id: 5, name: 'マイナビ' },
  { id: 3, name: 'ケイ・コーポレーション' },
];
const MAIN_IDS = new Set(MAIN_CUSTOMERS.map(c => c.id));
const KAIHATSU_ID = 0;
const ROWS = [...MAIN_CUSTOMERS, { id: KAIHATSU_ID, name: '開発案件' }];

const ACTUAL_STATUSES = new Set(['won','done','monthly','shikakake']);
const FORECAST_STATUSES = new Set(['forecast','developing']);

const toMonth = s => s?.replace('検収','') || null;
const yen = v => `¥${(Number(v)||0).toLocaleString()}`;
const s = arr => arr.reduce((a,b) => a + (Number(b)||0), 0);

export default function SalesTable() {
  const [deals, setDeals] = useState([]);
  const [targets, setTargets] = useState({});
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');

  useEffect(() => {
    fetch(`${API}/deals`).then(r => r.json()).then(setDeals);
    fetch(`${API}/targets`).then(r => r.json()).then(rows => {
      const map = {};
      rows.forEach(r => { map[`${r.customer_id}_${r.month}`] = r.amount; });
      setTargets(map);
    });
  }, []);

  // 実績・見込集計
  const actualsMap = {};
  const forecastsMap = {};
  deals.forEach(d => {
    const month = toMonth(d.inspection_date);
    if (!month) return;
    const cid = MAIN_IDS.has(d.customer_id) ? d.customer_id : KAIHATSU_ID;
    if (ACTUAL_STATUSES.has(d.status)) {
      if (!actualsMap[cid]) actualsMap[cid] = {};
      actualsMap[cid][month] = (actualsMap[cid][month] || 0) + (Number(d.amount) || 0);
    }
    if (FORECAST_STATUSES.has(d.status)) {
      if (!forecastsMap[cid]) forecastsMap[cid] = {};
      forecastsMap[cid][month] = (forecastsMap[cid][month] || 0) + (Number(d.amount) || 0);
    }
  });

  const getActual   = (cid, m) => actualsMap[cid]?.[m] || 0;
  const getForecast = (cid, m) => forecastsMap[cid]?.[m] || 0;
  const getTarget   = (cid, m) => targets[`${cid}_${m}`] || 0;

  const sumRow = (fn, cid, months) => months.reduce((t, m) => t + fn(cid, m), 0);
  const sumCol = (fn, m) => ROWS.reduce((t, r) => t + fn(r.id, m), 0);
  const sumAll = (fn, months) => months.reduce((t, m) => t + sumCol(fn, m), 0);

  const commitEdit = (cid, month) => {
    const amount = Number(String(editVal).replace(/,/g,'')) || 0;
    const key = `${cid}_${month}`;
    setTargets(prev => ({ ...prev, [key]: amount }));
    setEditing(null);
    fetch(`${API}/targets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: cid, month, amount }),
    });
  };

  // スタイル定数
  const border = '1px solid #1e2a45';
  const th = (extra={}) => ({
    padding: '5px 8px', border, background: '#0d1120',
    color: '#8a9bc0', fontSize: '11px', textAlign: 'center',
    whiteSpace: 'nowrap', ...extra,
  });
  const td = (extra={}) => ({
    padding: '8px 8px', border, fontSize: '12px',
    textAlign: 'right', whiteSpace: 'nowrap', ...extra,
  });
  const sectionTd = (bg, color) => ({
    ...td(), writingMode: 'vertical-rl',
    textAlign: 'center', fontWeight: 700, fontSize: '13px',
    background: bg, color, width: '24px', padding: '8px 4px',
  });
  const nameTd = (bg) => ({ ...td(), textAlign: 'left', background: bg, color: '#c9d1e8' });
  const numTd = (bg, color='#c9d1e8') => ({ ...td(), background: bg, color });
  const subtotalTd = (bg, color='#7ec8e3') => ({ ...td(), background: bg, color, fontWeight: 600 });
  const totalTd = (bg, color) => ({ ...td(), background: bg, color, fontWeight: 700 });
  const diffTd = (v, bg) => ({ ...td(), background: bg, color: v > 0 ? '#34d399' : v < 0 ? '#ff4d6a' : '#6b7fa3', fontWeight: 700 });

  const BG_TARGET   = 'rgba(74,158,186,0.06)';
  const BG_ACTUAL   = 'rgba(52,211,153,0.06)';
  const BG_FORECAST = 'rgba(251,146,60,0.06)';
  const BG_TOTAL_T  = 'rgba(74,158,186,0.13)';
  const BG_TOTAL_A  = 'rgba(52,211,153,0.13)';
  const BG_TOTAL_F  = 'rgba(251,146,60,0.13)';
  const BG_DIFF     = 'rgba(250,204,21,0.07)';
  const BG_SUB_T    = 'rgba(74,158,186,0.10)';
  const BG_SUB_A    = 'rgba(52,211,153,0.10)';
  const BG_SUB_F    = 'rgba(251,146,60,0.10)';

  const EditCell = ({ cid, month, bg }) => {
    const key = `${cid}_${month}`;
    const val = getTarget(cid, month);
    if (editing === key) {
      return (
        <td style={{ ...td(), background: bg, padding: 0 }}>
          <input autoFocus value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onBlur={() => commitEdit(cid, month)}
            onKeyDown={e => e.key === 'Enter' && commitEdit(cid, month)}
            style={{ width: '100%', padding: '4px 8px', background: 'rgba(0,212,255,0.15)',
              border: 'none', borderBottom: '2px solid #00d4ff', color: '#00d4ff',
              fontSize: '12px', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }}
          />
        </td>
      );
    }
    return (
      <td style={{ ...numTd(bg, key in targets ? '#c9d1e8' : '#2a3a58'), cursor: 'pointer' }}
        onClick={() => { setEditing(key); setEditVal(val ? String(val) : ''); }}
        title="クリックして編集">
        {key in targets ? yen(val) : '¥0'}
      </td>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ color: '#e2e8f0', marginBottom: '16px' }}>売上管理表</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px', background: '#0a0e1a' }}>
          <thead>
            {/* ヘッダー行1: 年 */}
            <tr>
              <th style={th({ background: '#060a14' })} colSpan={2} rowSpan={3}>受託開発</th>
              <th style={th()} colSpan={4}>2025年</th>
              <th style={th()} colSpan={11}>2026年</th>
            </tr>
            {/* ヘッダー行2: 期 */}
            <tr>
              <th style={th({ color: '#6b9fd4' })} colSpan={7}>上期</th>
              <th style={th({ color: '#6b9fd4' })} colSpan={7}>下期</th>
              <th style={th({ color: '#00d4ff' })} rowSpan={2}>合計</th>
            </tr>
            {/* ヘッダー行3: 月 */}
            <tr>
              {UPPER.map(m => <th key={m} style={th()}>{m}</th>)}
              <th style={th({ color: '#00d4ff' })}>小計</th>
              {LOWER.map(m => <th key={m} style={th()}>{m}</th>)}
              <th style={th({ color: '#00d4ff' })}>小計</th>
            </tr>
          </thead>
          <tbody>
            {/* ===== 目標 ===== */}
            {ROWS.map((row, i) => (
              <tr key={`t_${row.id}`}>
                {i === 0 && <td style={sectionTd('rgba(74,158,186,0.12)', '#4a9eba')} rowSpan={ROWS.length + 1}>目　標</td>}
                <td style={nameTd(BG_TOTAL_T)}>{row.name}</td>
                {UPPER.map(m => <EditCell key={m} cid={row.id} month={m} bg={BG_TOTAL_T} />)}
                <td style={subtotalTd(BG_TOTAL_T)}>{yen(sumRow(getTarget, row.id, UPPER))}</td>
                {LOWER.map(m => <EditCell key={m} cid={row.id} month={m} bg={BG_TOTAL_T} />)}
                <td style={subtotalTd(BG_TOTAL_T)}>{yen(sumRow(getTarget, row.id, LOWER))}</td>
                <td style={totalTd(BG_TOTAL_T, '#7ec8e3')}>{yen(sumRow(getTarget, row.id, ALL_MONTHS))}</td>
              </tr>
            ))}
            {/* 目標合計 */}
            <tr>
              <td style={{ ...td(), textAlign: 'left', background: BG_TOTAL_T, color: '#4a9eba', fontWeight: 700 }}>合計</td>
              {UPPER.map(m => <td key={m} style={numTd(BG_TOTAL_T, '#7ec8e3')}>{yen(sumCol(getTarget, m))}</td>)}
              <td style={subtotalTd(BG_SUB_T)}>{yen(sumAll(getTarget, UPPER))}</td>
              {LOWER.map(m => <td key={m} style={numTd(BG_TOTAL_T, '#7ec8e3')}>{yen(sumCol(getTarget, m))}</td>)}
              <td style={subtotalTd(BG_SUB_T)}>{yen(sumAll(getTarget, LOWER))}</td>
              <td style={totalTd(BG_TOTAL_T, '#7ec8e3')}>{yen(sumAll(getTarget, ALL_MONTHS))}</td>
            </tr>

            {/* ===== 実績 ===== */}
            {ROWS.map((row, i) => (
              <tr key={`a_${row.id}`}>
                {i === 0 && <td style={sectionTd('rgba(52,211,153,0.12)', '#34d399')} rowSpan={ROWS.length + 1}>実　績</td>}
                <td style={nameTd(BG_TOTAL_A)}>{row.name}</td>
                {UPPER.map(m => <td key={m} style={numTd(BG_TOTAL_A)}>{yen(getActual(row.id, m))}</td>)}
                <td style={subtotalTd(BG_TOTAL_A)}>{yen(sumRow(getActual, row.id, UPPER))}</td>
                {LOWER.map(m => <td key={m} style={numTd(BG_TOTAL_A)}>{yen(getActual(row.id, m))}</td>)}
                <td style={subtotalTd(BG_TOTAL_A)}>{yen(sumRow(getActual, row.id, LOWER))}</td>
                <td style={totalTd(BG_TOTAL_A, '#34d399')}>{yen(sumRow(getActual, row.id, ALL_MONTHS))}</td>
              </tr>
            ))}
            {/* 実績合計 */}
            <tr>
              <td style={{ ...td(), textAlign: 'left', background: BG_TOTAL_A, color: '#34d399', fontWeight: 700 }}>合計</td>
              {UPPER.map(m => <td key={m} style={numTd(BG_TOTAL_A, '#34d399')}>{yen(sumCol(getActual, m))}</td>)}
              <td style={subtotalTd(BG_SUB_A, '#34d399')}>{yen(sumAll(getActual, UPPER))}</td>
              {LOWER.map(m => <td key={m} style={numTd(BG_TOTAL_A, '#34d399')}>{yen(sumCol(getActual, m))}</td>)}
              <td style={subtotalTd(BG_SUB_A, '#34d399')}>{yen(sumAll(getActual, LOWER))}</td>
              <td style={totalTd(BG_TOTAL_A, '#34d399')}>{yen(sumAll(getActual, ALL_MONTHS))}</td>
            </tr>

            {/* ===== 実績差異 ===== */}
            <tr>
              <td colSpan={2} style={{ ...td(), textAlign: 'center', background: BG_DIFF, color: '#facc15', fontWeight: 700 }}>実績差異</td>
              {UPPER.map(m => { const v = sumCol(getActual,m)-sumCol(getTarget,m); return <td key={m} style={diffTd(v,BG_DIFF)}>{yen(v)}</td>; })}
              {(()=>{ const v=sumAll(getActual,UPPER)-sumAll(getTarget,UPPER); return <td style={{ ...diffTd(v,BG_DIFF), fontWeight:700 }}>{yen(v)}</td>; })()}
              {LOWER.map(m => { const v = sumCol(getActual,m)-sumCol(getTarget,m); return <td key={m} style={diffTd(v,BG_DIFF)}>{yen(v)}</td>; })}
              {(()=>{ const v=sumAll(getActual,LOWER)-sumAll(getTarget,LOWER); return <td style={{ ...diffTd(v,BG_DIFF), fontWeight:700 }}>{yen(v)}</td>; })()}
              {(()=>{ const v=sumAll(getActual,ALL_MONTHS)-sumAll(getTarget,ALL_MONTHS); return <td style={{ ...diffTd(v,BG_DIFF), fontWeight:700 }}>{yen(v)}</td>; })()}
            </tr>

            {/* ===== 見込 ===== */}
            {ROWS.map((row, i) => (
              <tr key={`f_${row.id}`}>
                {i === 0 && <td style={sectionTd('rgba(251,146,60,0.12)', '#fb923c')} rowSpan={ROWS.length + 1}>見　込</td>}
                <td style={nameTd(BG_TOTAL_F)}>{row.name}</td>
                {UPPER.map(m => <td key={m} style={numTd(BG_TOTAL_F)}>{yen(getForecast(row.id, m))}</td>)}
                <td style={subtotalTd(BG_TOTAL_F)}>{yen(sumRow(getForecast, row.id, UPPER))}</td>
                {LOWER.map(m => <td key={m} style={numTd(BG_TOTAL_F)}>{yen(getForecast(row.id, m))}</td>)}
                <td style={subtotalTd(BG_TOTAL_F)}>{yen(sumRow(getForecast, row.id, LOWER))}</td>
                <td style={totalTd(BG_TOTAL_F, '#fb923c')}>{yen(sumRow(getForecast, row.id, ALL_MONTHS))}</td>
              </tr>
            ))}
            {/* 見込合計 */}
            <tr>
              <td style={{ ...td(), textAlign: 'left', background: BG_TOTAL_F, color: '#fb923c', fontWeight: 700 }}>合計</td>
              {UPPER.map(m => <td key={m} style={numTd(BG_TOTAL_F, '#fb923c')}>{yen(sumCol(getForecast, m))}</td>)}
              <td style={subtotalTd(BG_SUB_F, '#fb923c')}>{yen(sumAll(getForecast, UPPER))}</td>
              {LOWER.map(m => <td key={m} style={numTd(BG_TOTAL_F, '#fb923c')}>{yen(sumCol(getForecast, m))}</td>)}
              <td style={subtotalTd(BG_SUB_F, '#fb923c')}>{yen(sumAll(getForecast, LOWER))}</td>
              <td style={totalTd(BG_TOTAL_F, '#fb923c')}>{yen(sumAll(getForecast, ALL_MONTHS))}</td>
            </tr>

            {/* ===== 実績＋見込差異 ===== */}
            <tr>
              <td colSpan={2} style={{ ...td(), textAlign: 'center', background: BG_DIFF, color: '#facc15', fontWeight: 700 }}>実績＋見込差異</td>
              {UPPER.map(m => { const v = sumCol(getActual,m)+sumCol(getForecast,m)-sumCol(getTarget,m); return <td key={m} style={diffTd(v,BG_DIFF)}>{yen(v)}</td>; })}
              {(()=>{ const v=sumAll(getActual,UPPER)+sumAll(getForecast,UPPER)-sumAll(getTarget,UPPER); return <td style={{ ...diffTd(v,BG_DIFF), fontWeight:700 }}>{yen(v)}</td>; })()}
              {LOWER.map(m => { const v = sumCol(getActual,m)+sumCol(getForecast,m)-sumCol(getTarget,m); return <td key={m} style={diffTd(v,BG_DIFF)}>{yen(v)}</td>; })}
              {(()=>{ const v=sumAll(getActual,LOWER)+sumAll(getForecast,LOWER)-sumAll(getTarget,LOWER); return <td style={{ ...diffTd(v,BG_DIFF), fontWeight:700 }}>{yen(v)}</td>; })()}
              {(()=>{ const v=sumAll(getActual,ALL_MONTHS)+sumAll(getForecast,ALL_MONTHS)-sumAll(getTarget,ALL_MONTHS); return <td style={{ ...diffTd(v,BG_DIFF), fontWeight:700 }}>{yen(v)}</td>; })()}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
