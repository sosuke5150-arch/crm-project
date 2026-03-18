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
  { id: 'tsuki', section: '2026年3月単月',       label25: '第25期3月度',     label24: '第24期3月度'     },
  { id: 'q2',    section: '第25期 第3四半期',    label25: '第25期 第3四半期', label24: '第24期 第3四半期' },
  { id: 'cum',   section: '期初〜当月までの累積', label25: '第25期 累積',     label24: '第24期 累積'     },
  { id: 'full',  section: '通期',                label25: '第25期 通期',     label24: '第24期 通期'     },
];

const DEFAULT_TABLE = {
  tsuki: { b25: '6700',  a25: '4930',  f25: '',      b24: '5460',  a24: '5480'  },
  q2:    { b25: '21600', a25: '4930',  f25: '36527', b24: '18520', a24: '5480'  },
  cum:   { b25: '49171', a25: '55001', f25: '',      b24: '41232', a24: '47406' },
  full:  { b25: '93772', a25: '55001', f25: '95826', b24: '79632', a24: '47406' },
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

  // 画像読み取り
  const [imgAnalyzing, setImgAnalyzing] = useState(false);
  const [imgPreview,   setImgPreview]   = useState(null);
  const [imgResult,    setImgResult]    = useState(null);
  const [imgError,     setImgError]     = useState(null);
  const fileInputRef = useRef(null);

  const handleImageSelect = async (file) => {
    if (!file) return;
    setImgPreview(URL.createObjectURL(file));
    setImgResult(null);
    setImgError(null);
    setImgAnalyzing(true);

    const form = new FormData();
    form.append('image', file);
    try {
      const res = await fetch(`${API}/common-sheet/analyze-image`, { method: 'POST', body: form });
      const json = await res.json();
      if (json.success) {
        setImgResult(json.data);
      } else {
        setImgError(json.error || '解析に失敗しました');
      }
    } catch (e) {
      setImgError('サーバーに接続できませんでした');
    } finally {
      setImgAnalyzing(false);
    }
  };

  const applyImageResult = () => {
    if (!imgResult) return;
    const d = imgResult;
    if (d.title)        { setTitle(d.title);             save({ title: d.title }); }
    if (d.author)       { setAuthor(d.author);            save({ author: d.author }); }
    if (d.gaiyou)       { setGaiyou(d.gaiyou);            save({ gaiyou: d.gaiyou }); }
    if (d.kadai)        { setKadai(d.kadai);              save({ kadai: d.kadai }); }
    if (d.taisaku)      { setTaisaku(d.taisaku);          save({ taisaku: d.taisaku }); }
    if (d.jiyo_yosoku)  { setJiyoYosoku(d.jiyo_yosoku);  save({ jiyo_yosoku: d.jiyo_yosoku }); }
    if (d.table_data) {
      const merged = { ...DEFAULT_TABLE };
      ['tsuki','q2','cum','full'].forEach(k => {
        if (d.table_data[k]) merged[k] = { ...DEFAULT_TABLE[k], ...d.table_data[k] };
      });
      setTableData(merged);
      save({ table_data: JSON.stringify(merged) });
    }
    setImgPreview(null);
    setImgResult(null);
  };

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

      {/* 画像取り込みボタン */}
      <div style={{ marginBottom: '16px' }}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => handleImageSelect(e.target.files[0])} />
        <button
          onClick={() => { setImgPreview(null); setImgResult(null); setImgError(null); fileInputRef.current.click(); }}
          style={{ padding: '7px 16px', background: '#1a4a7a', color: '#7dd3fc', border: '1px solid #2a5a9a',
            borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          📷 画像から読み取り
        </button>
      </div>

      {/* 画像解析パネル */}
      {(imgPreview || imgAnalyzing || imgError) && (
        <div style={{ marginBottom: '20px', border: S.border, borderRadius: '8px', padding: '16px',
          background: S.bgTextArea, display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {imgPreview && (
            <img src={imgPreview} alt="取り込み画像"
              style={{ maxWidth: '260px', maxHeight: '200px', objectFit: 'contain', border: S.border, borderRadius: '4px' }} />
          )}
          <div style={{ flex: 1, minWidth: '200px' }}>
            {imgAnalyzing && (
              <div style={{ color: S.calcColor, fontWeight: 600 }}>⏳ 画像を解析中...</div>
            )}
            {imgError && (
              <div style={{ color: S.negColor, fontWeight: 600 }}>⚠️ {imgError}</div>
            )}
            {imgResult && !imgAnalyzing && (
              <>
                <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: '10px' }}>✅ 解析完了</div>
                {imgResult.title        && <div style={{ fontSize: '12px', color: S.textSub, marginBottom: '4px' }}>タイトル: <span style={{ color: S.text }}>{imgResult.title}</span></div>}
                {imgResult.author       && <div style={{ fontSize: '12px', color: S.textSub, marginBottom: '4px' }}>著者: <span style={{ color: S.text }}>{imgResult.author}</span></div>}
                {imgResult.gaiyou       && <div style={{ fontSize: '12px', color: S.textSub, marginBottom: '4px' }}>概況: <span style={{ color: S.text }}>{imgResult.gaiyou.slice(0, 60)}…</span></div>}
                {imgResult.table_data   && <div style={{ fontSize: '12px', color: S.textSub, marginBottom: '4px' }}>数値テーブル: <span style={{ color: S.text }}>抽出済み</span></div>}
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button onClick={applyImageResult}
                    style={{ padding: '6px 18px', background: '#1a5a2a', color: '#4ade80', border: '1px solid #2a7a3a',
                      borderRadius: '5px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
                    適用する
                  </button>
                  <button onClick={() => { setImgPreview(null); setImgResult(null); setImgError(null); }}
                    style={{ padding: '6px 14px', background: 'transparent', color: S.textSub, border: S.border,
                      borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>
                    閉じる
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
