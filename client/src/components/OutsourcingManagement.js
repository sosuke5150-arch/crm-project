import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:3001';

const MONTHS = [
  '2025-09','2025-10','2025-11','2025-12',
  '2026-01','2026-02','2026-03','2026-04',
  '2026-05','2026-06','2026-07','2026-08',
];

const MONTH_LABELS = MONTHS.map(ym => {
  const [y, m] = ym.split('-');
  return `${y}年${parseInt(m)}月`;
});

function getColors() {
  const theme = document.body.dataset.theme || 'dark';
  if (theme === 'excel') return {
    border:        '1px solid #aaa',
    bgHeader:      '#2f5496',
    bgHeaderText:  '#ffffff',
    bgBase:        '#ffffff',
    bgAlt:         '#f2f2f2',
    bgSummaryRow:  '#dce8f4',
    text:          '#1a1a1a',
    textSub:       '#555',
    calcColor:     '#1a5fa8',
    negColor:      '#c00000',
    bgInput:       '#ffffcc',
    bgModal:       '#f0f4ff',
    borderModal:   '#aabbdd',
    textModal:     '#1a1a1a',
    bgModalInput:  '#ffffff',
    bgBtn:         '#2e75b6',
    bgBtnCancel:   '#e0e0e0',
    bgBudgetRow:      '#dce6f1',
    bgActualRow:      '#e2efda',
    budgetNumColor:   '#1a1a1a',
    actualNumColor:   '#1a1a1a',
  };
  if (theme === 'earth') return {
    border:        '1px solid #b08050',
    bgHeader:      '#6b3e1e',
    bgHeaderText:  '#fff0d8',
    bgBase:        '#faf6ef',
    bgAlt:         '#f0e8d8',
    bgSummaryRow:  '#e8d8c0',
    text:          '#3a2410',
    textSub:       '#7a5030',
    calcColor:     '#8b5a1a',
    negColor:      '#a02000',
    bgInput:       '#fffbf0',
    bgModal:       '#3d2b1f',
    borderModal:   '#7a5030',
    textModal:     '#faf6ef',
    bgModalInput:  '#2a1a0f',
    bgBtn:         '#7a4010',
    bgBtnCancel:   '#5a3820',
    bgBudgetRow:      '#f0e8d0',
    bgActualRow:      '#e8f0e0',
    budgetNumColor:   '#3a2410',
    actualNumColor:   '#3a2410',
  };
  return {
    border:        '1px solid #2a3a58',
    bgHeader:      '#1a2f58',
    bgHeaderText:  '#e0e8ff',
    bgBase:        '#0d1628',
    bgAlt:         '#0a1020',
    bgSummaryRow:  '#0a1830',
    text:          '#c9d1e8',
    textSub:       '#8a9ab8',
    calcColor:     '#60b8e8',
    negColor:      '#ff6060',
    bgInput:       '#1a2640',
    bgModal:       '#1e2a45',
    borderModal:   '#4a5a7a',
    textModal:     '#c9d1e8',
    bgModalInput:  '#0d1628',
    bgBtn:         '#2a5fa8',
    bgBtnCancel:   '#2a3a58',
    bgBudgetRow:      '#0e1f3a',
    bgActualRow:      '#0a1a28',
    budgetNumColor:   '#90c8f0',
    actualNumColor:   '#facc15',
  };
}

const parseNum = v => { const n = Number(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n; };
const fmtNum   = v => { const n = Number(v); if (isNaN(n) || n === 0) return ''; return n.toLocaleString(); };
const fmtNumZ  = v => { return (Number(v) || 0).toLocaleString(); };

// ===== 編集可能な金額セル =====
function AmountCell({ value, onSave, S, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');

  const commit = () => { onSave(parseNum(draft)); setEditing(false); };

  if (editing) {
    return (
      <td style={{ border: S.border, padding: 0, ...style }}>
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === 'Enter' && commit()}
          style={{
            width: '100%', height: '24px',
            border: `2px solid ${S.calcColor}`,
            background: S.bgInput, color: S.text,
            textAlign: 'right', padding: '0 4px',
            fontSize: '12px', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </td>
    );
  }

  return (
    <td
      style={{ border: S.border, padding: '3px 6px', textAlign: 'right', fontSize: '12px', color: S.text, cursor: 'text', minWidth: '80px', ...style }}
      onClick={() => { setDraft(value ? String(value) : ''); setEditing(true); }}
    >
      {fmtNum(value)}
    </td>
  );
}

// ===== モーダル =====
function Modal({ onClose, children, S }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: S.bgModal, border: `1px solid ${S.borderModal}`, borderRadius: '10px', padding: '20px', minWidth: '240px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
      >
        {children}
      </div>
    </div>
  );
}

// ===== メインコンポーネント =====
export default function OutsourcingManagement() {
  const S = getColors();

  const [bps,          setBps]          = useState([]);
  const [amounts,      setAmounts]      = useState({});  // `${bpId}-${ym}-${type}` → number
  const [tasks,        setTasks]        = useState({});  // `${bpId}-${ym}` → {task_name, task_color}
  const [annualBudget, setAnnualBudget] = useState(0);

  const [editingTask, setEditingTask] = useState(null); // {bpId, ym, text, color}
  const [editingBp,   setEditingBp]   = useState(null); // {id, name, note, highlight_color}
  const [addingBp,    setAddingBp]    = useState(false);
  const [newBpName,   setNewBpName]   = useState('');
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft,   setBudgetDraft]   = useState('');
  const [memo,          setMemo]          = useState('');
  const [editingMemo,   setEditingMemo]   = useState(false);
  const [memoDraft,     setMemoDraft]     = useState('');

  // ===== データ読み込み =====
  useEffect(() => {
    fetch(`${API}/outsourcing/data`)
      .then(r => r.json())
      .then(d => {
        setBps(d.bps);
        const am = {};
        d.amounts.forEach(a => { am[`${a.bp_id}-${a.year_month}-${a.type}`] = a.amount; });
        setAmounts(am);
        const tm = {};
        d.tasks.forEach(t => { tm[`${t.bp_id}-${t.year_month}`] = { task_name: t.task_name, task_color: t.task_color }; });
        setTasks(tm);
        setAnnualBudget(Number(d.settings.annual_budget) || 0);
        setMemo(d.settings.memo || '');
      });
  }, []);

  const getAmount = useCallback((bpId, ym, type) => amounts[`${bpId}-${ym}-${type}`] || 0, [amounts]);
  const getTask   = useCallback((bpId, ym) => tasks[`${bpId}-${ym}`] || { task_name: '', task_color: '' }, [tasks]);

  const saveAmount = useCallback((bpId, ym, type, value) => {
    setAmounts(prev => ({ ...prev, [`${bpId}-${ym}-${type}`]: value }));
    fetch(`${API}/outsourcing/amount`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bp_id: bpId, year_month: ym, type, amount: value }),
    });
  }, []);

  const saveTask = useCallback((bpId, ym, taskName, taskColor) => {
    setTasks(prev => ({ ...prev, [`${bpId}-${ym}`]: { task_name: taskName, task_color: taskColor } }));
    fetch(`${API}/outsourcing/task`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bp_id: bpId, year_month: ym, task_name: taskName, task_color: taskColor }),
    });
  }, []);

  const saveAnnualBudget = () => {
    const n = parseNum(budgetDraft);
    setAnnualBudget(n);
    setEditingBudget(false);
    fetch(`${API}/outsourcing/settings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'annual_budget', value: String(n) }),
    });
  };

  const addBp = async () => {
    if (!newBpName.trim()) return;
    const res = await fetch(`${API}/outsourcing/bp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newBpName.trim(), note: '', highlight_color: '' }),
    });
    const data = await res.json();
    setBps(prev => [...prev, data]);
    setNewBpName(''); setAddingBp(false);
  };

  const deleteBp = async (id) => {
    if (!window.confirm('このBPを削除しますか？')) return;
    await fetch(`${API}/outsourcing/bp/${id}`, { method: 'DELETE' });
    setBps(prev => prev.filter(bp => bp.id !== id));
    setAmounts(prev => {
      const next = { ...prev };
      MONTHS.forEach(ym => { delete next[`${id}-${ym}-budget`]; delete next[`${id}-${ym}-actual`]; });
      return next;
    });
    setTasks(prev => {
      const next = { ...prev };
      MONTHS.forEach(ym => { delete next[`${id}-${ym}`]; });
      return next;
    });
  };

  const saveBpEdit = async () => {
    if (!editingBp) return;
    await fetch(`${API}/outsourcing/bp/${editingBp.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingBp),
    });
    setBps(prev => prev.map(bp => bp.id === editingBp.id ? { ...bp, ...editingBp } : bp));
    setEditingBp(null);
  };

  // ===== 集計 =====
  const monthBudgetTotal = ym => bps.reduce((s, bp) => s + getAmount(bp.id, ym, 'budget'), 0);
  const monthActualTotal = ym => bps.reduce((s, bp) => s + getAmount(bp.id, ym, 'actual'), 0);
  const bpBudgetTotal    = id  => MONTHS.reduce((s, ym) => s + getAmount(id, ym, 'budget'), 0);
  const bpActualTotal    = id  => MONTHS.reduce((s, ym) => s + getAmount(id, ym, 'actual'), 0);

  // 全体残予算（累計実績を年間予算から引く）
  const globalRemaining = MONTHS.reduce((acc, ym) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : annualBudget;
    acc.push(prev - monthActualTotal(ym));
    return acc;
  }, []);

  const totalEstimate = MONTHS.reduce((s, ym) => s + monthBudgetTotal(ym), 0);
  const diff = annualBudget - totalEstimate;

  // ===== 共通スタイル =====
  const thStyle = {
    background: S.bgHeader, color: S.bgHeaderText,
    border: S.border, padding: '5px 6px',
    fontSize: '11px', fontWeight: 700,
    textAlign: 'center', whiteSpace: 'nowrap',
  };
  const tdBase = { border: S.border, padding: '3px 6px', fontSize: '12px', color: S.text };
  const sumTd  = { ...tdBase, background: S.bgSummaryRow, textAlign: 'right', fontWeight: 600, color: S.calcColor };

  const inputStyle = {
    width: '100%', padding: '6px 10px', boxSizing: 'border-box',
    border: `1px solid ${S.borderModal}`, borderRadius: '5px',
    background: S.bgModalInput, color: S.textModal, fontSize: '13px',
  };
  const btnPrimary = {
    flex: 1, padding: '6px', background: S.bgBtn, border: 'none',
    borderRadius: '5px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
  };
  const btnCancel = {
    padding: '6px 12px', background: S.bgBtnCancel, border: 'none',
    borderRadius: '5px', color: S.textModal, cursor: 'pointer', fontSize: '13px',
  };

  return (
    <div style={{ padding: '24px', color: S.text }}>

      {/* ===== タスク編集モーダル ===== */}
      {editingTask && (
        <Modal onClose={() => setEditingTask(null)} S={S}>
          <div style={{ fontWeight: 700, marginBottom: '12px', color: S.textModal }}>担当業務編集</div>
          <input
            autoFocus value={editingTask.text}
            onChange={e => setEditingTask(p => ({ ...p, text: e.target.value }))}
            placeholder="担当業務名"
            style={{ ...inputStyle, marginBottom: '10px' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', color: S.textSub }}>背景色:</span>
            <input type="color"
              value={editingTask.color || '#aabbcc'}
              onChange={e => setEditingTask(p => ({ ...p, color: e.target.value }))}
              style={{ width: '40px', height: '28px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
            />
            <button onClick={() => setEditingTask(p => ({ ...p, color: '' }))}
              style={{ fontSize: '11px', padding: '3px 8px', border: `1px solid ${S.borderModal}`, borderRadius: '4px', background: 'transparent', color: S.textSub, cursor: 'pointer' }}>
              なし
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { saveTask(editingTask.bpId, editingTask.ym, editingTask.text, editingTask.color); setEditingTask(null); }} style={btnPrimary}>保存</button>
            <button onClick={() => setEditingTask(null)} style={btnCancel}>キャンセル</button>
          </div>
        </Modal>
      )}

      {/* ===== BP編集モーダル ===== */}
      {editingBp && (
        <Modal onClose={() => setEditingBp(null)} S={S}>
          <div style={{ fontWeight: 700, marginBottom: '12px', color: S.textModal }}>BP編集</div>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', color: S.textSub, marginBottom: '4px' }}>BP名</div>
            <input value={editingBp.name} onChange={e => setEditingBp(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', color: S.textSub, marginBottom: '4px' }}>備考（例：契約終了）</div>
            <input value={editingBp.note} onChange={e => setEditingBp(p => ({ ...p, note: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', color: S.textSub }}>ハイライト色:</span>
            <input type="color"
              value={editingBp.highlight_color || '#ffff88'}
              onChange={e => setEditingBp(p => ({ ...p, highlight_color: e.target.value }))}
              style={{ width: '40px', height: '28px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
            />
            <button onClick={() => setEditingBp(p => ({ ...p, highlight_color: '' }))}
              style={{ fontSize: '11px', padding: '3px 8px', border: `1px solid ${S.borderModal}`, borderRadius: '4px', background: 'transparent', color: S.textSub, cursor: 'pointer' }}>
              なし
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={saveBpEdit} style={btnPrimary}>保存</button>
            <button onClick={() => setEditingBp(null)} style={btnCancel}>キャンセル</button>
          </div>
        </Modal>
      )}

      {/* ===== ページヘッダー ===== */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>■25期 外注予算管理表</h2>
        <span style={{ fontSize: '12px', color: S.textSub }}>(税別)</span>
      </div>

      {/* ===== 25期外注予算入力行 ===== */}
      <div style={{ marginBottom: '16px' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: 'auto' }}>
          <tbody>
            <tr>
              <td style={{ ...tdBase, padding: '4px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>年間外注予算</td>
              <AmountCell
                value={annualBudget}
                S={S}
                style={{ minWidth: '100px', maxWidth: '120px', color: S.budgetNumColor }}
                onSave={val => {
                  setAnnualBudget(val);
                  fetch(`${API}/outsourcing/settings`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'annual_budget', value: String(val) }),
                  });
                }}
              />
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== 上部テーブル（予算・実績） ===== */}
      <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px', whiteSpace: 'nowrap' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '110px' }}>BP</th>
              <th style={{ ...thStyle, width: '36px' }}>予実</th>
              {MONTH_LABELS.map((label, i) => (
                <th key={MONTHS[i]} style={{ ...thStyle, minWidth: '84px' }}>{label}</th>
              ))}
              <th style={{ ...thStyle, minWidth: '90px' }}>合計</th>
            </tr>
          </thead>
          <tbody>
            {bps.map((bp, bpIdx) => {
              const hlColor = bp.highlight_color || null;
              const bpRowBg   = hlColor || S.bgBudgetRow;
              const actualRowBg = hlColor || S.bgBase;
              return [
                // 予算行
                <tr key={`${bp.id}-b`} style={{ background: bpRowBg }}>
                  <td rowSpan={2}
                    style={{ ...tdBase, textAlign: 'center', fontWeight: 700, cursor: 'pointer', verticalAlign: 'middle', position: 'relative', background: hlColor || S.bgBase }}
                    onClick={() => setEditingBp({ id: bp.id, name: bp.name, note: bp.note || '', highlight_color: bp.highlight_color || '' })}
                    title="クリックして編集"
                  >
                    {bp.name}
                    {bp.note && <div style={{ fontSize: '10px', color: S.textSub, fontWeight: 400 }}>{bp.note}</div>}
                    <button
                      onClick={e => { e.stopPropagation(); deleteBp(bp.id); }}
                      style={{ position: 'absolute', top: '2px', right: '2px', background: 'none', border: 'none', cursor: 'pointer', color: S.negColor, fontSize: '11px', lineHeight: 1, padding: '0' }}
                      title="削除"
                    >×</button>
                  </td>
                  <td style={{ ...tdBase, color: S.textSub, fontSize: '11px', textAlign: 'center', background: bpRowBg }}>予算</td>
                  {MONTHS.map(ym => (
                    <AmountCell key={ym} value={getAmount(bp.id, ym, 'budget')} S={S}
                      style={{ background: bpRowBg, color: S.budgetNumColor }}
                      onSave={val => saveAmount(bp.id, ym, 'budget', val)} />
                  ))}
                  <td style={{ ...tdBase, textAlign: 'right', fontWeight: 700, color: S.calcColor, background: bpRowBg }}>
                    {fmtNum(bpBudgetTotal(bp.id))}
                  </td>
                </tr>,
                // 実績行
                <tr key={`${bp.id}-a`} style={{ background: actualRowBg }}>
                  <td style={{ ...tdBase, color: S.textSub, fontSize: '11px', textAlign: 'center', background: actualRowBg }}>実績</td>
                  {MONTHS.map(ym => (
                    <AmountCell key={ym} value={getAmount(bp.id, ym, 'actual')} S={S}
                      style={{ background: actualRowBg, color: S.actualNumColor }}
                      onSave={val => saveAmount(bp.id, ym, 'actual', val)} />
                  ))}
                  <td style={{ ...tdBase, textAlign: 'right', fontWeight: 700, color: S.actualNumColor, background: actualRowBg }}>
                    {fmtNum(bpActualTotal(bp.id))}
                  </td>
                </tr>,
              ];
            })}

            {/* 月次予算計 */}
            <tr>
              <td colSpan={2} style={{ ...sumTd, textAlign: 'left' }}>月次予算計</td>
              {MONTHS.map(ym => <td key={ym} style={sumTd}>{fmtNumZ(monthBudgetTotal(ym))}</td>)}
              <td style={sumTd}>{fmtNumZ(MONTHS.reduce((s, ym) => s + monthBudgetTotal(ym), 0))}</td>
            </tr>

            {/* 月次実績計 */}
            <tr>
              <td colSpan={2} style={{ ...sumTd, textAlign: 'left' }}>月次実績計</td>
              {MONTHS.map(ym => <td key={ym} style={sumTd}>{fmtNumZ(monthActualTotal(ym))}</td>)}
              <td style={sumTd}>{fmtNumZ(MONTHS.reduce((s, ym) => s + monthActualTotal(ym), 0))}</td>
            </tr>

            {/* 月次残予算 */}
            <tr>
              <td colSpan={2} style={{ ...sumTd, textAlign: 'left' }}>月次残予算</td>
              {MONTHS.map(ym => {
                const v = monthBudgetTotal(ym) - monthActualTotal(ym);
                return <td key={ym} style={{ ...sumTd, color: v < 0 ? S.negColor : S.calcColor }}>{fmtNumZ(v)}</td>;
              })}
              {(() => { const v = MONTHS.reduce((s, ym) => s + monthBudgetTotal(ym) - monthActualTotal(ym), 0); return <td style={{ ...sumTd, color: v < 0 ? S.negColor : S.calcColor }}>{fmtNumZ(v)}</td>; })()}
            </tr>

            {/* 全体残予算 */}
            <tr>
              <td colSpan={2} style={{ ...sumTd, textAlign: 'left' }}>全体残予算</td>
              {globalRemaining.map((v, i) => (
                <td key={MONTHS[i]} style={{ ...sumTd, color: v < 0 ? S.negColor : S.calcColor }}>{fmtNumZ(v)}</td>
              ))}
              <td style={sumTd}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* BP追加 */}
      <div style={{ marginBottom: '32px' }}>
        {addingBp ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              autoFocus value={newBpName}
              onChange={e => setNewBpName(e.target.value)}
              placeholder="BP名"
              onKeyDown={e => e.key === 'Enter' && addBp()}
              style={{ padding: '4px 10px', border: S.border, borderRadius: '4px', background: S.bgBase, color: S.text, fontSize: '13px' }}
            />
            <button onClick={addBp}
              style={{ padding: '4px 14px', background: S.bgBtn, border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              追加
            </button>
            <button onClick={() => { setAddingBp(false); setNewBpName(''); }}
              style={{ padding: '4px 10px', background: 'transparent', border: S.border, borderRadius: '4px', color: S.textSub, cursor: 'pointer', fontSize: '12px' }}>
              キャンセル
            </button>
          </div>
        ) : (
          <button onClick={() => setAddingBp(true)}
            style={{ padding: '4px 14px', background: 'transparent', border: S.border, borderRadius: '4px', color: S.textSub, cursor: 'pointer', fontSize: '12px' }}>
            ＋ BP追加
          </button>
        )}
      </div>

      {/* ===== 担当業務テーブル ===== */}
      <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>担当業務</h3>
      <div style={{ overflowX: 'auto', marginBottom: '32px' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px', whiteSpace: 'nowrap' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '110px' }}>BP</th>
              {MONTH_LABELS.map((label, i) => (
                <th key={MONTHS[i]} style={{ ...thStyle, minWidth: '84px' }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bps.map((bp, bpIdx) => (
              <tr key={bp.id} style={{ background: bpIdx % 2 === 0 ? S.bgBase : S.bgAlt }}>
                <td style={{ ...tdBase, textAlign: 'center', fontWeight: 600 }}>{bp.name}</td>
                {MONTHS.map(ym => {
                  const t = getTask(bp.id, ym);
                  const hasBg = !!t.task_color;
                  return (
                    <td
                      key={ym}
                      style={{
                        ...tdBase,
                        background: t.task_color || 'transparent',
                        color: hasBg ? '#111' : S.text,
                        textAlign: 'center',
                        cursor: 'pointer',
                        minWidth: '84px',
                      }}
                      onClick={() => setEditingTask({ bpId: bp.id, ym, text: t.task_name, color: t.task_color })}
                      title="クリックして編集"
                    >
                      {t.task_name}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== 右下サマリー ===== */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: 'auto' }}>
          <tbody>
            <tr>
              <td style={{ ...tdBase, padding: '4px 10px', whiteSpace: 'nowrap' }}>年間外注予算</td>
              <td style={{ ...tdBase, padding: '4px 10px', textAlign: 'right', fontWeight: 700, color: S.budgetNumColor, cursor: 'pointer', minWidth: '100px' }}
                onClick={() => { setBudgetDraft(String(annualBudget)); setEditingBudget(true); }}>
                {editingBudget ? (
                  <input
                    autoFocus value={budgetDraft}
                    onChange={e => setBudgetDraft(e.target.value)}
                    onBlur={saveAnnualBudget}
                    onKeyDown={e => e.key === 'Enter' && saveAnnualBudget()}
                    style={{ width: '120px', textAlign: 'right', background: S.bgInput, color: S.text, border: `1px solid ${S.calcColor}`, padding: '2px 6px', fontSize: '13px', outline: 'none' }}
                  />
                ) : annualBudget.toLocaleString()}
              </td>
            </tr>
            <tr>
              <td style={{ ...tdBase, padding: '4px 10px', whiteSpace: 'nowrap' }}>想定外注費合計</td>
              <td style={{ ...tdBase, padding: '4px 10px', textAlign: 'right', fontWeight: 700, color: S.actualNumColor }}>{totalEstimate.toLocaleString()}</td>
            </tr>
            <tr>
              <td style={{ ...tdBase, padding: '4px 10px', whiteSpace: 'nowrap' }}>差分</td>
              <td style={{ ...tdBase, padding: '4px 10px', textAlign: 'right', fontWeight: 700, color: diff < 0 ? S.negColor : S.calcColor }}>{diff.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== メモ ===== */}
      <div style={{ marginTop: '24px', maxWidth: '860px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: S.text, marginBottom: '8px' }}>経緯メモ</div>
        {editingMemo ? (
          <div>
            <textarea
              autoFocus
              value={memoDraft}
              onChange={e => setMemoDraft(e.target.value)}
              rows={10}
              style={{
                width: '100%', padding: '10px 12px', boxSizing: 'border-box',
                border: S.border, borderRadius: '4px',
                background: S.bgBase, color: S.text,
                fontSize: '13px', lineHeight: '1.7', resize: 'vertical', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => {
                  setMemo(memoDraft);
                  setEditingMemo(false);
                  fetch(`${API}/outsourcing/settings`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'memo', value: memoDraft }),
                  });
                }}
                style={{ padding: '4px 16px', background: S.bgBtn, border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
              >保存</button>
              <button
                onClick={() => setEditingMemo(false)}
                style={{ padding: '4px 12px', background: 'transparent', border: S.border, borderRadius: '4px', color: S.textSub, cursor: 'pointer', fontSize: '12px' }}
              >キャンセル</button>
            </div>
          </div>
        ) : memo ? (
          <div style={{ background: 'transparent', padding: '0', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '10px', right: '12px', display: 'flex', gap: '6px' }}>
              <button
                onClick={() => { setMemoDraft(memo); setEditingMemo(true); }}
                style={{ padding: '3px 12px', background: 'transparent', border: S.border, borderRadius: '4px', color: S.text, cursor: 'pointer', fontSize: '12px' }}
              >編集</button>
              <button
                onClick={() => {
                  if (!window.confirm('メモを削除しますか？')) return;
                  setMemo('');
                  fetch(`${API}/outsourcing/settings`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'memo', value: '' }),
                  });
                }}
                style={{ padding: '3px 12px', background: 'transparent', border: `1px solid ${S.negColor}`, borderRadius: '4px', color: S.negColor, cursor: 'pointer', fontSize: '12px' }}
              >削除</button>
            </div>
            <div style={{ fontSize: '13px', lineHeight: '1.8', color: S.text, whiteSpace: 'pre-wrap', paddingRight: '100px' }}>
              {memo}
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setMemoDraft(''); setEditingMemo(true); }}
            style={{ padding: '5px 16px', background: 'transparent', border: S.border, borderRadius: '4px', color: S.textSub, cursor: 'pointer', fontSize: '12px' }}
          >＋ メモを追加</button>
        )}
      </div>
    </div>
  );
}
