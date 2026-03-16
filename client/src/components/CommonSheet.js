import { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:3001';

// ===== テーマ別カラー =====
function getSheetColors() {
  const theme = document.body.dataset.theme || 'dark';
  if (theme === 'excel') {
    return {
      border:    '1px solid #999',
      bgHeader:  '#2f5496',
      bgSection: '#d9e2f3',
      bgRow25:   '#ffffff',
      bgRow24:   '#f2f2f2',
      text:      '#1a1a1a',
      textSub:   '#444',
      calcColor: '#1a5fa8',
      negColor:  '#c00000',
      bgTable:   '#ffffff',
      bgTextArea:'#ffffff',
    };
  }
  if (theme === 'earth') {
    return {
      border:    '1px solid #b08050',
      bgHeader:  '#6b3e1e',
      bgSection: '#e8d8c0',
      bgRow25:   '#faf6ef',
      bgRow24:   '#f0e8d8',
      text:      '#3a2410',
      textSub:   '#7a5030',
      calcColor: '#8b5a1a',
      negColor:  '#a02000',
      bgTable:   '#faf6ef',
      bgTextArea:'#faf6ef',
    };
  }
  return {
    border:    '1px solid #2a3a58',
    bgHeader:  '#1a2f58',
    bgSection: '#1a2d4a',
    bgRow25:   '#0d1628',
    bgRow24:   '#0a1020',
    text:      '#c9d1e8',
    textSub:   '#8a9ab8',
    calcColor: '#60b8e8',
    negColor:  '#ff6060',
    bgTable:   '#0a0e1a',
    bgTextArea:'#0d1120',
  };
}

// ===== ユーティリティ =====
const parseNum = v => { const n = Number(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n; };
const fmtNum   = v => { if (v === '' || v == null) return ''; const n = Number(v); return isNaN(n) ? '' : n.toLocaleString(); };
const fmtPct   = (num, den) => (!den || !num) ? '—' : (parseNum(num) / parseNum(den) * 100).toFixed(2) + '%';
const fmtDiff  = (a, b) => (a === '' || b === '') ? '—' : (parseNum(a) - parseNum(b)).toLocaleString();

const SECTIONS = [
  { id: 'tsuki', section: '2026年2月単月',       label25: '第25期2月度',     label24: '第24期2月度'     },
  { id: 'q2',    section: '25 第二四半期',        label25: '第25期第2四半期', label24: '第24期第2四半期' },
  { id: 'cum',   section: '期初〜当月までの累積', label25: '第25期 累積',     label24: '第24期 累積'     },
  { id: 'full',  section: '通期',                label25: '第25期 通期',     label24: '第24期 通期'     },
];

const DEFAULT_TABLE = {
  tsuki: { b25: '14700', a25: '19668', f25: '',      b24: '7960',  a24: '8070'  },
  q2:    { b25: '27492', a25: '36527', f25: '36527', b24: '20272', a24: '13272' },
  cum:   { b25: '42472', a25: '54772', f25: '',      b24: '35772', a24: '41926' },
  full:  { b25: '93772', a25: '54772', f25: '95826', b24: '79632', a24: '41926' },
};

export default function CommonSheet() {
  const [tableData,   setTableData]   = useState(DEFAULT_TABLE);
  const [title,       setTitle]       = useState('25期3月全体会議（2月報告）');
  const [author,      setAuthor]      = useState('開発（マイナビ＋開発案件）：生田目 真史');
  const [gaiyou,      setGaiyou]      = useState('');
  const [kadai,       setKadai]       = useState('');
  const [taisaku,     setTaisaku]     = useState('');
  const [jiyoYosoku,  setJiyoYosoku]  = useState('');
  const saveTimer = useRef(null);

  // 初期ロード
  useEffect(() => {
    fetch(`${API}/common-sheet`).then(r => r.json()).then(d => {
      if (d.title)       setTitle(d.title);
      if (d.author)      setAuthor(d.author);
      if (d.gaiyou)      setGaiyou(d.gaiyou);
      if (d.kadai)       setKadai(d.kadai);
      if (d.taisaku)     setTaisaku(d.taisaku);
      if (d.jiyo_yosoku) setJiyoYosoku(d.jiyo_yosoku);
      if (d.table_data)  { try { setTableData(JSON.parse(d.table_data)); } catch(e) {} }
    }).catch(() => {});
  }, []);

  // 自動保存（500ms デバウンス）
  const save = (patch) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`${API}/common-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    }, 500);
  };

  const updateTable = (id, field, val) => {
    setTableData(prev => {
      const next = { ...prev, [id]: { ...prev[id], [field]: val } };
      save({ table_data: JSON.stringify(next) });
      return next;
    });
  };

  const S = getSheetColors();

  const th = (extra = {}) => ({
    border: S.border, padding: '5px 6px', background: S.bgHeader, color: '#fff',
    fontSize: '12px', textAlign: 'center', whiteSpace: 'nowrap', ...extra,
  });
  const td = (bg, extra = {}) => ({
    border: S.border, padding: '5px 6px', background: bg, fontSize: '12px', color: S.text, ...extra,
  });

  const NumCell = ({ value, onChange, bg }) => (
    <td style={td(bg, { textAlign: 'right', fontWeight: 700, padding: 0 })}>
      <input type="text" value={fmtNum(value)} onChange={e => onChange(e.target.value.replace(/,/g, ''))}
        style={{ width: '100%', padding: '5px 6px', border: 'none', outline: 'none', background: 'transparent',
          fontSize: '12px', textAlign: 'right', fontWeight: 700, color: S.text, boxSizing: 'border-box', fontFamily: 'inherit' }} />
    </td>
  );

  const CalcCell = ({ value, bg }) => {
    const isNeg = typeof value === 'string' && value.startsWith('-');
    return (
      <td style={td(bg, { textAlign: 'right', color: isNeg ? S.negColor : S.calcColor, fontWeight: 700 })}>
        {value}
      </td>
    );
  };

  const SectionRow = ({ label }) => (
    <tr>
      <td colSpan={9} contentEditable suppressContentEditableWarning
        style={{ border: S.border, padding: '4px 8px', background: S.bgSection, fontWeight: 700, fontSize: '12px', outline: 'none', color: S.text }}>
        {label}
      </td>
    </tr>
  );

  return (
    <div style={{ padding: '24px', fontFamily: "'メイリオ','Meiryo','Hiragino Kaku Gothic Pro',sans-serif", color: S.text }}>

      {/* タイトル */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
        <h2 contentEditable suppressContentEditableWarning
          onBlur={e => { setTitle(e.currentTarget.textContent); save({ title: e.currentTarget.textContent }); }}
          style={{ margin: 0, fontSize: '18px', fontWeight: 700, outline: 'none', color: S.text }}
          suppressContentEditableWarning>
          {title}
        </h2>
        <div contentEditable suppressContentEditableWarning
          onBlur={e => { setAuthor(e.currentTarget.textContent); save({ author: e.currentTarget.textContent }); }}
          style={{ fontSize: '12px', color: S.textSub, outline: 'none' }}>
          {author}
        </div>
      </div>

      {/* メインテーブル */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '12px', background: S.bgTable }}>
          <thead>
            <tr>
              <th style={th({ rowSpan: 2, width: '150px' })} rowSpan={2}>【マイナビ＋ケイコーポ＋開発案件】</th>
              <th style={th({ colSpan: 2 })} colSpan={2}>予算</th>
              <th style={th({ colSpan: 2 })} colSpan={2}>実績</th>
              <th style={th({ colSpan: 2 })} colSpan={2}>実績差異</th>
              <th style={th({ colSpan: 2 })} colSpan={2}>着地予測</th>
            </tr>
            <tr>
              <th style={th()}>金額（千円）</th><th style={th()}>昨対</th>
              <th style={th()}>金額（千円）</th><th style={th()}>昨対</th>
              <th style={th()}>金額（千円）</th><th style={th()}>対予算進捗率</th>
              <th style={th()}>金額（千円）</th><th style={th()}>対予算進捗率</th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map(({ id, section, label25, label24 }) => {
              const d = tableData[id];
              return [
                <SectionRow key={`s_${id}`} label={section} />,
                <tr key={`25_${id}`}>
                  <td contentEditable suppressContentEditableWarning style={td(S.bgRow25, { outline: 'none', fontWeight: 700 })}>{label25}</td>
                  <NumCell value={d.b25} onChange={v => updateTable(id, 'b25', v)} bg={S.bgRow25} />
                  <CalcCell value={fmtPct(d.b25, d.b24)} bg={S.bgRow25} />
                  <NumCell value={d.a25} onChange={v => updateTable(id, 'a25', v)} bg={S.bgRow25} />
                  <CalcCell value={fmtPct(d.a25, d.a24)} bg={S.bgRow25} />
                  <CalcCell value={fmtDiff(d.a25, d.b25)} bg={S.bgRow25} />
                  <CalcCell value={fmtPct(d.a25, d.b25)} bg={S.bgRow25} />
                  <NumCell value={d.f25} onChange={v => updateTable(id, 'f25', v)} bg={S.bgRow25} />
                  <CalcCell value={fmtPct(d.f25, d.b25)} bg={S.bgRow25} />
                </tr>,
                <tr key={`24_${id}`}>
                  <td contentEditable suppressContentEditableWarning style={td(S.bgRow24, { outline: 'none' })}>{label24}</td>
                  <NumCell value={d.b24} onChange={v => updateTable(id, 'b24', v)} bg={S.bgRow24} />
                  <CalcCell value="—" bg={S.bgRow24} />
                  <NumCell value={d.a24} onChange={v => updateTable(id, 'a24', v)} bg={S.bgRow24} />
                  <CalcCell value="—" bg={S.bgRow24} />
                  <CalcCell value={fmtDiff(d.a24, d.b24)} bg={S.bgRow24} />
                  <CalcCell value={fmtPct(d.a24, d.b24)} bg={S.bgRow24} />
                  <CalcCell value="—" bg={S.bgRow24} />
                  <CalcCell value="—" bg={S.bgRow24} />
                </tr>,
              ];
            })}
          </tbody>
        </table>
      </div>

      {/* テキストセクション */}
      <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '24px', fontSize: '13px', background: S.bgTable }}>
        <tbody>
          {[
            { label: '概況',     val: gaiyou,    set: setGaiyou,    key: 'gaiyou',      h: '100px' },
            { label: '課題',     val: kadai,     set: setKadai,     key: 'kadai',       h: '90px'  },
            { label: '対策',     val: taisaku,   set: setTaisaku,   key: 'taisaku',     h: '160px' },
            { label: '次月予測', val: jiyoYosoku,set: setJiyoYosoku,key: 'jiyo_yosoku', h: '50px'  },
          ].map(({ label, val, set, key, h }) => (
            <tr key={label}>
              <td style={{ border: S.border, padding: '8px 12px', width: '80px', background: S.bgSection, verticalAlign: 'middle', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', color: S.text }}>
                {label}
              </td>
              <td style={{ border: S.border, padding: '4px', background: S.bgTextArea }}>
                <textarea value={val} onChange={e => { set(e.target.value); save({ [key]: e.target.value }); }}
                  style={{ width: '100%', minHeight: h, padding: '8px', border: 'none', outline: 'none', resize: 'vertical', fontFamily: 'inherit', fontSize: '13px', lineHeight: '1.7', boxSizing: 'border-box', background: S.bgTextArea, color: S.text }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
