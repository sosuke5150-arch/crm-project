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

function getTableColors() {
  const theme = document.body.dataset.theme || 'dark';
  if (theme === 'excel') {
    return {
      targetSection: '#1f4e79',
      targetSub:     '#2e75b6',
      targetTotal:   '#2e75b6',
      actualSection: '#375623',
      actualSub:     '#538135',
      actualTotal:   '#538135',
      forecastSection: '#843c00',
      forecastSub:   '#c55a11',
      forecastTotal: '#c55a11',
      diffLabel:     '#7f6000',
      diffGain:      '#375623',
      diffLoss:      '#c00000',
      policyColor:   '#c55a11',
    };
  }
  if (theme === 'earth') {
    return {
      targetSection: '#2a5a8a',
      targetSub:     '#3a7aaa',
      targetTotal:   '#3a7aaa',
      actualSection: '#1e6b2a',
      actualSub:     '#2e8a38',
      actualTotal:   '#2e8a38',
      forecastSection: '#a03800',
      forecastSub:   '#c44e10',
      forecastTotal: '#c44e10',
      diffLabel:     '#9a7200',
      diffGain:      '#2e8a38',
      diffLoss:      '#b03020',
      policyColor:   '#b89010',
    };
  }
  // dark (default)
  return {
    targetSection: '#4a9eba',
    targetSub:     '#7ec8e3',
    targetTotal:   '#7ec8e3',
    actualSection: '#34d399',
    actualSub:     '#34d399',
    actualTotal:   '#34d399',
    forecastSection: '#fb923c',
    forecastSub:   '#fb923c',
    forecastTotal: '#fb923c',
    diffLabel:     '#facc15',
    diffGain:      '#34d399',
    diffLoss:      '#ff4d6a',
    policyColor:   '#facc15',
  };
}

export default function SalesTable() {
  const [deals, setDeals] = useState([]);
  const [targets, setTargets] = useState({});
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [notes, setNotes] = useState({ budget: '', policy: '' });
  const [editingSection, setEditingSection] = useState(null);
  const [noteEditText, setNoteEditText] = useState('');

  const C = getTableColors();

  useEffect(() => {
    fetch(`${API}/deals`).then(r => r.json()).then(setDeals);
    fetch(`${API}/notes`).then(r => r.json()).then(setNotes);
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

  const loadNotes = () => fetch(`${API}/notes`).then(r => r.json()).then(setNotes);

  const handleNoteEdit = (section) => {
    setEditingSection(section);
    setNoteEditText(notes[section] || '');
  };

  const handleNoteSave = async (section) => {
    await fetch(`${API}/notes/${section}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteEditText }),
    });
    setEditingSection(null);
    loadNotes();
  };

  const handleNoteDelete = async (section) => {
    if (!window.confirm('削除しますか？')) return;
    await fetch(`${API}/notes/${section}`, { method: 'DELETE' });
    loadNotes();
  };

  const renderNoteSection = (title, key) => (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-heading)' }}>【{title}】</div>
        {editingSection !== key && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-edit" onClick={() => handleNoteEdit(key)} style={{ padding: '3px 10px', fontSize: '12px' }}>編集</button>
            <button className="btn-delete" onClick={() => handleNoteDelete(key)} style={{ padding: '3px 10px', fontSize: '12px' }}>削除</button>
          </div>
        )}
      </div>
      {editingSection === key ? (
        <div>
          <textarea value={noteEditText} onChange={e => setNoteEditText(e.target.value)}
            style={{ width: '100%', minHeight: '160px', padding: '12px', background: 'var(--bg-panel)', color: 'var(--text-body)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.8' }} />
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button className="btn-edit" onClick={() => handleNoteSave(key)}>保存</button>
            <button className="btn-delete" onClick={() => setEditingSection(null)}>キャンセル</button>
          </div>
        </div>
      ) : (
        <div style={{ color: key === 'policy' ? C.policyColor : 'var(--text-body)', fontSize: '13px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
          {notes[key] || <span style={{ color: 'var(--text-muted)' }}>（内容なし）</span>}
        </div>
      )}
    </div>
  );

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
  const border = '1px solid var(--border)';
  const th = (extra={}) => ({
    padding: '5px 8px', border, background: 'var(--bg-panel)',
    color: 'var(--text-mid)', fontSize: '11px', textAlign: 'center',
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
  const nameTd = (bg) => ({ ...td(), textAlign: 'left', background: bg, color: 'var(--text-body)' });
  const numTd = (bg, color='var(--text-body)') => ({ ...td(), background: bg, color });
  const subtotalTd = (bg, color) => ({ ...td(), background: bg, color, fontWeight: 600 });
  const totalTd = (bg, color) => ({ ...td(), background: bg, color, fontWeight: 700 });
  const diffTd = (v, bg) => ({ ...td(), background: bg, color: v > 0 ? C.diffGain : v < 0 ? C.diffLoss : 'var(--text-muted)', fontWeight: 700 });

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
            style={{ width: '100%', padding: '4px 8px', background: 'var(--accent-bg)',
              border: 'none', borderBottom: '2px solid var(--accent)', color: 'var(--accent)',
              fontSize: '12px', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }}
          />
        </td>
      );
    }
    return (
      <td style={{ ...numTd(bg, key in targets ? 'var(--text-body)' : 'var(--border-mid)'), cursor: 'pointer' }}
        onClick={() => { setEditing(key); setEditVal(val ? String(val) : ''); }}
        title="クリックして編集">
        {key in targets ? yen(val) : '¥0'}
      </td>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ color: 'var(--text-heading)', marginBottom: '16px' }}>売上管理表</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px', background: 'var(--bg-inner)' }}>
          <thead>
            {/* ヘッダー行1: 年 */}
            <tr>
              <th style={th({ background: 'var(--bg-inner)' })} colSpan={2} rowSpan={3}>受託開発</th>
              <th style={th()} colSpan={4}>2025年</th>
              <th style={th()} colSpan={11}>2026年</th>
            </tr>
            {/* ヘッダー行2: 期 */}
            <tr>
              <th style={th({ color: 'var(--accent)' })} colSpan={7}>上期</th>
              <th style={th({ color: 'var(--accent)' })} colSpan={7}>下期</th>
              <th style={th({ color: 'var(--accent)' })} rowSpan={2}>合計</th>
            </tr>
            {/* ヘッダー行3: 月 */}
            <tr>
              {UPPER.map(m => <th key={m} style={th()}>{m}</th>)}
              <th style={th({ color: 'var(--accent)' })}>小計</th>
              {LOWER.map(m => <th key={m} style={th()}>{m}</th>)}
              <th style={th({ color: 'var(--accent)' })}>小計</th>
            </tr>
          </thead>
          <tbody>
            {/* ===== 目標 ===== */}
            {ROWS.map((row, i) => (
              <tr key={`t_${row.id}`}>
                {i === 0 && <td style={sectionTd('rgba(74,158,186,0.12)', C.targetSection)} rowSpan={ROWS.length + 1}>目　標</td>}
                <td style={nameTd(BG_TOTAL_T)}>{row.name}</td>
                {UPPER.map(m => <EditCell key={m} cid={row.id} month={m} bg={BG_TOTAL_T} />)}
                <td style={subtotalTd(BG_TOTAL_T, C.targetSub)}>{yen(sumRow(getTarget, row.id, UPPER))}</td>
                {LOWER.map(m => <EditCell key={m} cid={row.id} month={m} bg={BG_TOTAL_T} />)}
                <td style={subtotalTd(BG_TOTAL_T, C.targetSub)}>{yen(sumRow(getTarget, row.id, LOWER))}</td>
                <td style={totalTd(BG_TOTAL_T, C.targetTotal)}>{yen(sumRow(getTarget, row.id, ALL_MONTHS))}</td>
              </tr>
            ))}
            {/* 目標合計 */}
            <tr>
              <td style={{ ...td(), textAlign: 'left', background: BG_TOTAL_T, color: C.targetSection, fontWeight: 700 }}>合計</td>
              {UPPER.map(m => <td key={m} style={numTd(BG_TOTAL_T, C.targetSub)}>{yen(sumCol(getTarget, m))}</td>)}
              <td style={subtotalTd(BG_SUB_T, C.targetSub)}>{yen(sumAll(getTarget, UPPER))}</td>
              {LOWER.map(m => <td key={m} style={numTd(BG_TOTAL_T, C.targetSub)}>{yen(sumCol(getTarget, m))}</td>)}
              <td style={subtotalTd(BG_SUB_T, C.targetSub)}>{yen(sumAll(getTarget, LOWER))}</td>
              <td style={totalTd(BG_TOTAL_T, C.targetTotal)}>{yen(sumAll(getTarget, ALL_MONTHS))}</td>
            </tr>

            {/* ===== 実績 ===== */}
            {ROWS.map((row, i) => (
              <tr key={`a_${row.id}`}>
                {i === 0 && <td style={sectionTd('rgba(52,211,153,0.12)', C.actualSection)} rowSpan={ROWS.length + 1}>実　績</td>}
                <td style={nameTd(BG_TOTAL_A)}>{row.name}</td>
                {UPPER.map(m => <td key={m} style={numTd(BG_TOTAL_A)}>{yen(getActual(row.id, m))}</td>)}
                <td style={subtotalTd(BG_TOTAL_A, C.actualSub)}>{yen(sumRow(getActual, row.id, UPPER))}</td>
                {LOWER.map(m => <td key={m} style={numTd(BG_TOTAL_A)}>{yen(getActual(row.id, m))}</td>)}
                <td style={subtotalTd(BG_TOTAL_A, C.actualSub)}>{yen(sumRow(getActual, row.id, LOWER))}</td>
                <td style={totalTd(BG_TOTAL_A, C.actualTotal)}>{yen(sumRow(getActual, row.id, ALL_MONTHS))}</td>
              </tr>
            ))}
            {/* 実績合計 */}
            <tr>
              <td style={{ ...td(), textAlign: 'left', background: BG_TOTAL_A, color: C.actualSection, fontWeight: 700 }}>合計</td>
              {UPPER.map(m => <td key={m} style={numTd(BG_TOTAL_A, C.actualSub)}>{yen(sumCol(getActual, m))}</td>)}
              <td style={subtotalTd(BG_SUB_A, C.actualSub)}>{yen(sumAll(getActual, UPPER))}</td>
              {LOWER.map(m => <td key={m} style={numTd(BG_TOTAL_A, C.actualSub)}>{yen(sumCol(getActual, m))}</td>)}
              <td style={subtotalTd(BG_SUB_A, C.actualSub)}>{yen(sumAll(getActual, LOWER))}</td>
              <td style={totalTd(BG_TOTAL_A, C.actualTotal)}>{yen(sumAll(getActual, ALL_MONTHS))}</td>
            </tr>

            {/* ===== 実績差異 ===== */}
            <tr>
              <td colSpan={2} style={{ ...td(), textAlign: 'center', background: BG_DIFF, color: C.diffLabel, fontWeight: 700 }}>実績差異</td>
              {UPPER.map(m => { const v = sumCol(getActual,m)-sumCol(getTarget,m); return <td key={m} style={diffTd(v,BG_DIFF)}>{yen(v)}</td>; })}
              {(()=>{ const v=sumAll(getActual,UPPER)-sumAll(getTarget,UPPER); return <td style={{ ...diffTd(v,BG_DIFF), fontWeight:700 }}>{yen(v)}</td>; })()}
              {LOWER.map(m => { const v = sumCol(getActual,m)-sumCol(getTarget,m); return <td key={m} style={diffTd(v,BG_DIFF)}>{yen(v)}</td>; })}
              {(()=>{ const v=sumAll(getActual,LOWER)-sumAll(getTarget,LOWER); return <td style={{ ...diffTd(v,BG_DIFF), fontWeight:700 }}>{yen(v)}</td>; })()}
              {(()=>{ const v=sumAll(getActual,ALL_MONTHS)-sumAll(getTarget,ALL_MONTHS); return <td style={{ ...diffTd(v,BG_DIFF), fontWeight:700 }}>{yen(v)}</td>; })()}
            </tr>

            {/* ===== 見込 ===== */}
            {ROWS.map((row, i) => (
              <tr key={`f_${row.id}`}>
                {i === 0 && <td style={sectionTd('rgba(251,146,60,0.12)', C.forecastSection)} rowSpan={ROWS.length + 1}>見　込</td>}
                <td style={nameTd(BG_TOTAL_F)}>{row.name}</td>
                {UPPER.map(m => <td key={m} style={numTd(BG_TOTAL_F)}>{yen(getForecast(row.id, m))}</td>)}
                <td style={subtotalTd(BG_TOTAL_F, C.forecastSub)}>{yen(sumRow(getForecast, row.id, UPPER))}</td>
                {LOWER.map(m => <td key={m} style={numTd(BG_TOTAL_F)}>{yen(getForecast(row.id, m))}</td>)}
                <td style={subtotalTd(BG_TOTAL_F, C.forecastSub)}>{yen(sumRow(getForecast, row.id, LOWER))}</td>
                <td style={totalTd(BG_TOTAL_F, C.forecastTotal)}>{yen(sumRow(getForecast, row.id, ALL_MONTHS))}</td>
              </tr>
            ))}
            {/* 見込合計 */}
            <tr>
              <td style={{ ...td(), textAlign: 'left', background: BG_TOTAL_F, color: C.forecastSection, fontWeight: 700 }}>合計</td>
              {UPPER.map(m => <td key={m} style={numTd(BG_TOTAL_F, C.forecastSub)}>{yen(sumCol(getForecast, m))}</td>)}
              <td style={subtotalTd(BG_SUB_F, C.forecastSub)}>{yen(sumAll(getForecast, UPPER))}</td>
              {LOWER.map(m => <td key={m} style={numTd(BG_TOTAL_F, C.forecastSub)}>{yen(sumCol(getForecast, m))}</td>)}
              <td style={subtotalTd(BG_SUB_F, C.forecastSub)}>{yen(sumAll(getForecast, LOWER))}</td>
              <td style={totalTd(BG_TOTAL_F, C.forecastTotal)}>{yen(sumAll(getForecast, ALL_MONTHS))}</td>
            </tr>

            {/* ===== 実績＋見込差異 ===== */}
            <tr>
              <td colSpan={2} style={{ ...td(), textAlign: 'center', background: BG_DIFF, color: C.diffLabel, fontWeight: 700 }}>実績＋見込差異</td>
              {UPPER.map(m => { const v = sumCol(getActual,m)+sumCol(getForecast,m)-sumCol(getTarget,m); return <td key={m} style={diffTd(v,BG_DIFF)}>{yen(v)}</td>; })}
              {(()=>{ const v=sumAll(getActual,UPPER)+sumAll(getForecast,UPPER)-sumAll(getTarget,UPPER); return <td style={{ ...diffTd(v,BG_DIFF), fontWeight:700 }}>{yen(v)}</td>; })()}
              {LOWER.map(m => { const v = sumCol(getActual,m)+sumCol(getForecast,m)-sumCol(getTarget,m); return <td key={m} style={diffTd(v,BG_DIFF)}>{yen(v)}</td>; })}
              {(()=>{ const v=sumAll(getActual,LOWER)+sumAll(getForecast,LOWER)-sumAll(getTarget,LOWER); return <td style={{ ...diffTd(v,BG_DIFF), fontWeight:700 }}>{yen(v)}</td>; })()}
              {(()=>{ const v=sumAll(getActual,ALL_MONTHS)+sumAll(getForecast,ALL_MONTHS)-sumAll(getTarget,ALL_MONTHS); return <td style={{ ...diffTd(v,BG_DIFF), fontWeight:700 }}>{yen(v)}</td>; })()}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 予算経緯・重要方針 */}
      <div style={{ marginTop: '40px', maxWidth: '900px' }}>
        {renderNoteSection('予算経緯', 'budget')}
        {renderNoteSection('重要方針', 'policy')}
      </div>
    </div>
  );
}
