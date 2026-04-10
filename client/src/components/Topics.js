import { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:3001';

const STATUS_OPTIONS = ['', '完了', '概算見積提示', '失注', '提案中', '受注', '締結済み', '利用中'];
const INSPECTION_OPTIONS = [
  '', '月額', '月額(2月〜)', '月額(3月〜)', '月額(4月〜)', '月額(5月〜)',
  '1月末', '2月末', '3月末', '4月', '4月末', '5月末', '6月末',
  '7月', '7月末', '8月', '8月末', '9月末', '10月末', '11月末', '12月末',
];
const SECTIONS = ['既存顧客案件', '新規顧客案件'];

function getColors() {
  const theme = document.body.dataset.theme || 'dark';
  if (theme === 'excel') return {
    border: '#aaa',
    bgHeader: '#1f3864',
    bgHeaderText: '#ffffff',
    bgColHeader: '#2f5496',
    bgColHeaderText: '#ffffff',
    bgBase: '#ffffff',
    text: '#1a1a1a',
    textMuted: '#555',
    bgSelect: '#ffffff',
    bgAddBtn: '#2e75b6',
    bgAddBtnText: '#ffffff',
    delColor: '#c00000',
  };
  if (theme === 'earth') return {
    border: '#b08050',
    bgHeader: '#4a2a10',
    bgHeaderText: '#fff0d8',
    bgColHeader: '#6b3e1e',
    bgColHeaderText: '#fff0d8',
    bgBase: '#faf6ef',
    text: '#3a2410',
    textMuted: '#7a5030',
    bgSelect: '#faf6ef',
    bgAddBtn: '#7a4010',
    bgAddBtnText: '#fff0d8',
    delColor: '#a02000',
  };
  return {
    border: '#2a3a58',
    bgHeader: '#0f1e40',
    bgHeaderText: '#e0e8ff',
    bgColHeader: '#1a2f58',
    bgColHeaderText: '#a0b0d0',
    bgBase: '#0d1120',
    text: '#c9d1e8',
    textMuted: '#6b7fa3',
    bgSelect: '#0d1120',
    bgAddBtn: '#1a3a6a',
    bgAddBtnText: '#a0c0ff',
    delColor: '#ff6060',
  };
}

function getRowBg(status, isLight) {
  switch (status) {
    case '完了':       return isLight ? '#bdd7ee' : 'rgba(0,160,220,0.13)';
    case '失注':       return isLight ? '#d9d9d9' : 'rgba(140,140,140,0.18)';
    case '受注':       return isLight ? '#ffff99' : 'rgba(240,220,0,0.14)';
    case '締結済み':   return isLight ? '#f4cccc' : 'rgba(220,60,60,0.12)';
    case '利用中':     return isLight ? '#e2efda' : 'rgba(80,200,100,0.11)';
    default:           return 'transparent';
  }
}

export default function Topics() {
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [theme, setTheme] = useState(document.body.dataset.theme || 'dark');

  useEffect(() => {
    fetch(`${API}/topics`)
      .then(r => r.json())
      .then(setItems)
      .catch(() => {});
    fetch(`${API}/customers`)
      .then(r => r.json())
      .then(data => setCustomers(data.map(c => c.company || c.name).filter(Boolean)))
      .catch(() => {});
    const obs = new MutationObserver(() => setTheme(document.body.dataset.theme || 'dark'));
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const localUpdate = useCallback((id, field, value) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  }, []);

  const saveItem = useCallback(async (item) => {
    await fetch(`${API}/topics/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: item.customer || '',
        project: item.project || '',
        status: item.status || '',
        amount: item.amount || '',
        inspection_date: item.inspection_date || '',
        topics: item.topics || '',
      }),
    }).catch(console.error);
  }, []);

  const addItem = useCallback(async (section) => {
    const res = await fetch(`${API}/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section }),
    });
    const newItem = await res.json();
    setItems(prev => [...prev, newItem]);
  }, []);

  const deleteItem = useCallback(async (id) => {
    if (!window.confirm('この行を削除しますか？')) return;
    await fetch(`${API}/topics/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(it => it.id !== id));
  }, []);

  const C = getColors();
  const isLight = theme === 'excel' || theme === 'earth';

  const thStyle = (w) => ({
    padding: '7px 10px',
    background: C.bgColHeader,
    color: C.bgColHeaderText,
    fontSize: 12,
    fontWeight: 600,
    border: `1px solid ${C.border}`,
    whiteSpace: 'nowrap',
    textAlign: 'left',
    width: w,
  });

  const inputStyle = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: C.text,
    fontSize: 12,
    fontFamily: 'inherit',
    padding: 0,
    boxSizing: 'border-box',
  };

  const selectStyle = {
    background: isLight ? '#ffffff' : '#0a0e1a',
    border: `1px solid ${C.border}`,
    borderRadius: 3,
    color: C.text,
    fontSize: 12,
    fontFamily: 'inherit',
    padding: '3px 4px',
    cursor: 'pointer',
    width: '100%',
  };

  const LEGEND = [
    { label: '完了',   bg: isLight ? '#bdd7ee' : 'rgba(0,160,220,0.55)', border: false },
    { label: '対応中', bg: isLight ? '#ffffff'  : 'rgba(255,255,255,0.1)', border: true  },
    { label: '提案中', bg: isLight ? '#f0f0f0'  : 'rgba(180,180,180,0.1)', border: true },
    { label: 'つぶれ', bg: isLight ? '#d9d9d9'  : 'rgba(140,140,140,0.45)', border: false },
  ];

  return (
    <div style={{ padding: '16px 20px', fontFamily: 'var(--font)', color: C.text, minHeight: '100%' }}>
      {SECTIONS.map(section => {
        const sectionItems = items.filter(it => it.section === section);
        return (
          <div key={section} style={{ marginBottom: 36 }}>
            {/* Section header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: C.bgHeader,
              color: C.bgHeaderText,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: '4px 4px 0 0',
              border: `1px solid ${C.border}`,
              borderBottom: 'none',
            }}>
              <span>【{section}】</span>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 11 }}>
                {LEGEND.map(({ label, bg, border }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 12, height: 12, background: bg,
                      border: border ? `1px solid ${C.bgHeaderText}` : 'none',
                      borderRadius: 2, flexShrink: 0,
                    }} />
                    <span style={{ color: C.bgHeaderText, opacity: 0.9 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                border: `1px solid ${C.border}`,
                background: C.bgBase,
              }}>
                <thead>
                  <tr>
                    <th style={thStyle('110px')}>顧客</th>
                    <th style={thStyle('180px')}>プロジェクト</th>
                    <th style={thStyle('108px')}>ステータス</th>
                    <th style={{ ...thStyle('90px'), textAlign: 'right' }}>金額</th>
                    <th style={thStyle('100px')}>検収(予定)完了</th>
                    <th style={thStyle('')}>トピックス</th>
                    <th style={thStyle('32px')} />
                  </tr>
                </thead>
                <tbody>
                  {sectionItems.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{
                        padding: '18px', textAlign: 'center',
                        color: C.textMuted, fontSize: 12,
                        border: `1px solid ${C.border}`,
                        background: C.bgBase,
                      }}>
                        データがありません。「+ 行を追加」で追加してください。
                      </td>
                    </tr>
                  )}
                  {sectionItems.map(item => {
                    const rowBg = getRowBg(item.status, isLight);
                    const td = (extra = {}) => ({
                      padding: '5px 8px',
                      background: rowBg,
                      border: `1px solid ${C.border}`,
                      verticalAlign: 'top',
                      ...extra,
                    });
                    return (
                      <tr key={item.id}>
                        <td style={td({ padding: '4px 6px' })}>
                          <select
                            value={item.customer || ''}
                            onChange={e => {
                              const val = e.target.value;
                              localUpdate(item.id, 'customer', val);
                              const cur = items.find(it => it.id === item.id);
                              if (cur) saveItem({ ...cur, customer: val });
                            }}
                            style={selectStyle}
                          >
                            <option value="">—</option>
                            {customers.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td style={td()}>
                          <input
                            value={item.project || ''}
                            onChange={e => localUpdate(item.id, 'project', e.target.value)}
                            onBlur={() => {
                              const cur = items.find(it => it.id === item.id);
                              if (cur) saveItem(cur);
                            }}
                            style={inputStyle}
                          />
                        </td>
                        <td style={td({ padding: '4px 6px' })}>
                          <select
                            value={item.status || ''}
                            onChange={e => {
                              const val = e.target.value;
                              localUpdate(item.id, 'status', val);
                              const cur = items.find(it => it.id === item.id);
                              if (cur) saveItem({ ...cur, status: val });
                            }}
                            style={selectStyle}
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{s || '—'}</option>
                            ))}
                          </select>
                        </td>
                        <td style={td({ textAlign: 'right' })}>
                          <input
                            value={item.amount || ''}
                            onChange={e => localUpdate(item.id, 'amount', e.target.value)}
                            onBlur={() => {
                              const cur = items.find(it => it.id === item.id);
                              if (cur) saveItem(cur);
                            }}
                            style={{ ...inputStyle, textAlign: 'right' }}
                          />
                        </td>
                        <td style={td({ padding: '4px 6px' })}>
                          <select
                            value={item.inspection_date || ''}
                            onChange={e => {
                              const val = e.target.value;
                              localUpdate(item.id, 'inspection_date', val);
                              const cur = items.find(it => it.id === item.id);
                              if (cur) saveItem({ ...cur, inspection_date: val });
                            }}
                            style={selectStyle}
                          >
                            {INSPECTION_OPTIONS.map(s => (
                              <option key={s} value={s}>{s || '—'}</option>
                            ))}
                          </select>
                        </td>
                        <td style={td()}>
                          <textarea
                            value={item.topics || ''}
                            onChange={e => localUpdate(item.id, 'topics', e.target.value)}
                            onBlur={() => {
                              const cur = items.find(it => it.id === item.id);
                              if (cur) saveItem(cur);
                            }}
                            rows={Math.max(2, (item.topics || '').split('\n').length)}
                            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                          />
                        </td>
                        <td style={td({ padding: '3px', textAlign: 'center' })}>
                          <button
                            onClick={() => deleteItem(item.id)}
                            title="削除"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: C.delColor,
                              cursor: 'pointer',
                              fontSize: 15,
                              lineHeight: 1,
                              padding: '2px 5px',
                              borderRadius: 3,
                            }}
                          >×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add row button */}
            <button
              onClick={() => addItem(section)}
              style={{
                marginTop: 8,
                background: C.bgAddBtn,
                color: C.bgAddBtnText,
                border: 'none',
                borderRadius: 4,
                padding: '6px 18px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >＋ 行を追加</button>
          </div>
        );
      })}
    </div>
  );
}
