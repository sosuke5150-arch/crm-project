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
const toHalf   = s => String(s || '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30));
const parseNum = v => { const n = Number(toHalf(String(v)).replace(/,/g, '')); return isNaN(n) ? 0 : n; };
const fmtNum   = v => { if (v === '' || v == null) return ''; const h = toHalf(String(v)).replace(/,/g, ''); const n = Number(h); return isNaN(n) ? '' : n.toLocaleString(); };
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

function NumCell({ value, onChange, bg }) {
  const S = getSheetColors();
  return (
    <td style={{ border: S.border, padding: 0, background: bg, fontSize: '12px', color: S.text, textAlign: 'right', fontWeight: 700 }}>
      <input type="text" value={fmtNum(value)} onChange={e => onChange(e.target.value.replace(/,/g, ''))}
        onFocus={e => { e.target.style.outline = `1px solid ${S.calcColor}`; e.target.select(); }}
        onBlur={e => { e.target.style.outline = 'none'; }}
        style={{ width: '100%', padding: '5px 6px', border: 'none', outline: 'none', background: 'transparent',
          fontSize: '12px', textAlign: 'right', fontWeight: 700, color: S.text, boxSizing: 'border-box', fontFamily: 'inherit' }} />
    </td>
  );
}

function CalcCell({ value, bg }) {
  const S = getSheetColors();
  const isNeg = typeof value === 'string' && value.startsWith('-');
  return (
    <td style={{ border: S.border, padding: '5px 6px', background: bg, fontSize: '12px', color: isNeg ? S.negColor : S.calcColor, textAlign: 'right', fontWeight: 700 }}>
      {value}
    </td>
  );
}

// ===== HTML変換ユーティリティ =====
const toHTML = (val) => {
  if (!val) return '';
  if (/<[a-zA-Z][\s\S]*>/.test(val)) return val; // すでにHTML
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
};

// ===== リッチテキストエディタ =====
const RICH_COLORS = [
  { label: '赤', value: '#e53e3e' },
  { label: '橙', value: '#ed8936' },
  { label: '緑', value: '#48bb78' },
  { label: '青', value: '#4299e1' },
  { label: '紫', value: '#b794f4' },
];

function RichTextEditor({ value, onChange, minHeight }) {
  const S = getSheetColors();
  const editorRef = useRef(null);
  const prevValueRef = useRef(undefined);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;
    if (value !== prevValueRef.current) {
      editorRef.current.innerHTML = toHTML(value || '');
      prevValueRef.current = value;
    }
  }, [value]);

  const execCmd = (cmd, val = null) => {
    editorRef.current.focus();
    document.execCommand(cmd, false, val);
    const html = editorRef.current.innerHTML;
    prevValueRef.current = html;
    onChange(html);
  };

  const handleInput = (e) => {
    const html = e.currentTarget.innerHTML;
    prevValueRef.current = html;
    onChange(html);
  };

  const startEditing = () => {
    setEditing(true);
    setTimeout(() => editorRef.current?.focus(), 50);
  };

  const stopEditing = () => {
    setEditing(false);
  };

  const btnBase = {
    padding: '2px 8px', border: S.border, borderRadius: '3px',
    cursor: 'pointer', fontSize: '12px', lineHeight: '1.6',
    background: S.bgRow24, color: S.text, fontFamily: 'inherit',
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* 通常時: 右上に編集ボタン */}
      {!editing && (
        <button onClick={startEditing} style={{
          position: 'absolute', top: '4px', right: '4px', zIndex: 1,
          padding: '2px 10px', fontSize: '11px', border: S.border,
          borderRadius: '3px', cursor: 'pointer',
          background: S.bgRow24, color: S.textSub,
        }}>
          編集
        </button>
      )}

      {/* 編集中: ツールバー */}
      {editing && (
        <div style={{
          display: 'flex', gap: '4px', padding: '3px 6px', alignItems: 'center',
          borderBottom: S.border, background: S.bgRow24, flexWrap: 'wrap',
        }}>
          <button onMouseDown={e => { e.preventDefault(); execCmd('bold'); }}
            style={{ ...btnBase, fontWeight: 'bold', minWidth: '26px' }} title="太字">B</button>
          {RICH_COLORS.map(({ label, value: c }) => (
            <button key={c} onMouseDown={e => { e.preventDefault(); execCmd('foreColor', c); }}
              title={`${label}色`}
              style={{ ...btnBase, background: c, color: '#fff', border: 'none', minWidth: '26px', fontWeight: 'bold' }}>
              A
            </button>
          ))}
          <button onMouseDown={e => { e.preventDefault(); execCmd('removeFormat'); }}
            style={{ ...btnBase, fontSize: '11px', color: S.textSub }} title="書式をすべて解除">
            解除
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={stopEditing}
            style={{ ...btnBase, fontSize: '11px', color: S.calcColor, border: `1px solid ${S.calcColor}` }}>
            完了
          </button>
        </div>
      )}

      {/* エディタ本体 */}
      <div ref={editorRef} contentEditable={editing} suppressContentEditableWarning
        onInput={handleInput}
        onBlur={e => {
          const html = e.currentTarget.innerHTML;
          prevValueRef.current = html;
          onChange(html);
        }}
        style={{
          minHeight, padding: '8px', outline: 'none',
          lineHeight: '1.7', fontSize: '13px', fontFamily: 'inherit',
          color: S.text, wordBreak: 'break-word', boxSizing: 'border-box',
          cursor: editing ? 'text' : 'default',
        }}
      />
    </div>
  );
}

export default function CommonSheet() {
  const [tableData,   setTableData]   = useState(DEFAULT_TABLE);
  const [title,       setTitle]       = useState('25期3月全体会議（2月報告）');
  const [author,      setAuthor]      = useState('開発（マイナビ＋開発案件）：生田目 真史');
  const [gaiyou,      setGaiyou]      = useState('');
  const [kadai,       setKadai]       = useState('');
  const [taisaku,     setTaisaku]     = useState('');
  const [jiyoYosoku,  setJiyoYosoku]  = useState('');
  const saveTimer = useRef(null);
  const titleRef  = useRef(null);
  const authorRef = useRef(null);

  // contentEditable はReactが直接DOM更新しないためrefで同期
  useEffect(() => { if (titleRef.current && titleRef.current.textContent !== title) titleRef.current.textContent = title; }, [title]);
  useEffect(() => { if (authorRef.current && authorRef.current.textContent !== author) authorRef.current.textContent = author; }, [author]);

  // 画像読み取り
  const [imgAnalyzing,  setImgAnalyzing]  = useState(false);
  const [imgPreview,    setImgPreview]    = useState(null);
  const [imgOcrText,    setImgOcrText]    = useState(null);
  const [imgError,      setImgError]      = useState(null);
  const [imgPanelOpen,  setImgPanelOpen]  = useState(false);
  const [imgAnalyzedAt, setImgAnalyzedAt] = useState(null);
  const [imgParsing,    setImgParsing]    = useState(false);
  const [imgParsed,     setImgParsed]     = useState(null);
  const [imgParseError, setImgParseError] = useState(null);
  const [imgApplied,    setImgApplied]    = useState(false);
  const fileInputRef = useRef(null);

  const clearImage = () => {
    setImgPreview(null);
    setImgOcrText(null);
    setImgError(null);
    setImgPanelOpen(false);
    setImgAnalyzedAt(null);
    setImgParsing(false);
    setImgParsed(null);
    setImgParseError(null);
    setImgApplied(false);
  };

  const applyParsed = (parsed) => {
    const fullPatch = {};
    if (parsed.title)       { setTitle(parsed.title);             fullPatch.title = parsed.title; }
    if (parsed.author)      { setAuthor(parsed.author);           fullPatch.author = parsed.author; }
    if (parsed.gaiyou)      { setGaiyou(parsed.gaiyou);           fullPatch.gaiyou = parsed.gaiyou; }
    if (parsed.kadai)       { setKadai(parsed.kadai);             fullPatch.kadai = parsed.kadai; }
    if (parsed.taisaku)     { setTaisaku(parsed.taisaku);         fullPatch.taisaku = parsed.taisaku; }
    if (parsed.jiyo_yosoku) { setJiyoYosoku(parsed.jiyo_yosoku); fullPatch.jiyo_yosoku = parsed.jiyo_yosoku; }
    if (parsed.tableData) {
      // updater外で next を計算し、setTableData と save を分離
      const nextTable = { ...tableData };
      ['tsuki', 'q2', 'cum', 'full'].forEach(id => {
        if (parsed.tableData[id]) {
          nextTable[id] = { ...tableData[id], ...Object.fromEntries(
            Object.entries(parsed.tableData[id]).filter(([, v]) => v !== '' && v != null)
          )};
        }
      });
      setTableData(nextTable);
      fullPatch.table_data = JSON.stringify(nextTable);
    }
    if (Object.keys(fullPatch).length > 0) save(fullPatch);
    setImgApplied(true);
  };

  const handleImageSelect = async (file) => {
    if (!file) return;
    setImgPreview(URL.createObjectURL(file));
    setImgOcrText(null);
    setImgError(null);
    setImgAnalyzing(true);
    setImgPanelOpen(true);
    setImgAnalyzedAt(null);
    setImgParsed(null);
    setImgParseError(null);
    setImgApplied(false);

    const form = new FormData();
    form.append('image', file);
    try {
      const res = await fetch(`${API}/common-sheet/analyze-image`, { method: 'POST', body: form });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setImgError(errJson.error || `サーバーエラー (${res.status})`);
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setImgError(json.error || '解析に失敗しました');
        return;
      }
      setImgOcrText(json.text || '');
      setImgAnalyzedAt(new Date());
      if (json.parsed) {
        setImgParsed(json.parsed);
      } else if (json.parseError) {
        setImgParseError(json.parseError);
      }
    } catch (e) {
      setImgError('サーバーに接続できませんでした: ' + e.message);
    } finally {
      setImgAnalyzing(false);
    }
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
    const next = { ...tableData, [id]: { ...tableData[id], [field]: val } };
    setTableData(next);
    save({ table_data: JSON.stringify(next) });
  };

  const S = getSheetColors();

  const th = (extra = {}) => ({
    border: S.border, padding: '5px 6px', background: S.bgHeader, color: '#fff',
    fontSize: '12px', textAlign: 'center', whiteSpace: 'nowrap', ...extra,
  });
  const td = (bg, extra = {}) => ({
    border: S.border, padding: '5px 6px', background: bg, fontSize: '12px', color: S.text, ...extra,
  });

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
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => handleImageSelect(e.target.files[0])} />
        <button
          onClick={() => { clearImage(); fileInputRef.current.click(); }}
          style={{ padding: '7px 16px', background: '#1a4a7a', color: '#7dd3fc', border: '1px solid #2a5a9a',
            borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          📷 画像から読み取り
        </button>
        {(imgPreview || imgOcrText || imgError) && !imgPanelOpen && (
          <button onClick={() => setImgPanelOpen(true)}
            style={{ padding: '7px 16px', background: 'transparent', color: S.calcColor, border: S.border,
              borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            📄 読み取り結果を表示
            {imgAnalyzedAt && <span style={{ fontSize: '11px', marginLeft: '8px', color: S.textSub }}>
              ({imgAnalyzedAt.toLocaleString('ja-JP')})
            </span>}
          </button>
        )}
        {(imgPreview || imgOcrText || imgError) && (
          <button onClick={clearImage}
            style={{ padding: '7px 16px', background: 'transparent', color: S.negColor, border: `1px solid ${S.negColor}`,
              borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            🗑 消去
          </button>
        )}
      </div>

      {/* 画像解析パネル */}
      {imgPanelOpen && (imgPreview || imgAnalyzing || imgError || imgOcrText) && (
        <div style={{ marginBottom: '20px', border: S.border, borderRadius: '8px', padding: '16px',
          background: S.bgTextArea }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {imgPreview && (
              <img src={imgPreview} alt="取り込み画像"
                style={{ maxWidth: '260px', maxHeight: '200px', objectFit: 'contain', border: S.border, borderRadius: '4px' }} />
            )}
            <div style={{ flex: 1, minWidth: '200px' }}>
              {imgAnalyzing && (
                <div style={{ color: S.calcColor, fontWeight: 600 }}>⏳ 画像を解析中（初回はAIが起動するまで少し時間がかかります）...</div>
              )}
              {imgError && (
                <div style={{ color: S.negColor, fontWeight: 600, marginBottom: '6px' }}>⚠️ {imgError}</div>
              )}
              {!imgAnalyzing && !imgError && imgAnalyzedAt && (
                <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: '2px' }}>✅ OCR完了</div>
              )}
              {imgAnalyzedAt && (
                <div style={{ color: S.textSub, fontSize: '11px', marginBottom: '8px' }}>
                  取り込み日時：{imgAnalyzedAt.toLocaleString('ja-JP')}
                </div>
              )}
              {imgParseError && (
                <div style={{ color: S.negColor, fontSize: '12px', marginBottom: '8px',
                  background: 'rgba(255,0,0,0.08)', padding: '6px 10px', borderRadius: '4px' }}>
                  ⚠️ AI解析エラー：{imgParseError}
                </div>
              )}
              {imgParsed && (
                imgApplied
                  ? <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: '8px' }}>
                      ✅ フィールドに反映しました（各欄で直接編集できます）
                    </div>
                  : <button onClick={() => applyParsed(imgParsed)}
                      style={{ padding: '6px 16px', background: '#1a5a2a', color: '#4ade80', border: '1px solid #4ade80',
                        borderRadius: '5px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                      ✨ 解析結果をフィールドに自動反映する
                    </button>
              )}
              <button onClick={() => setImgPanelOpen(false)}
                style={{ padding: '4px 12px', background: 'transparent', color: S.textSub, border: S.border,
                  borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>
                閉じる
              </button>
            </div>
          </div>
          {imgOcrText && !imgAnalyzing && (
            <textarea readOnly value={imgOcrText}
              style={{ marginTop: '12px', width: '100%', minHeight: '200px', padding: '10px', border: S.border,
                borderRadius: '4px', background: S.bgRow24, color: S.text, fontSize: '12px', lineHeight: '1.7',
                fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
          )}
        </div>
      )}

      {/* 共通シートラベル */}
      <div style={{ fontSize: '12px', color: S.textSub, marginBottom: '4px' }}>共通シート</div>

      {/* タイトル */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
        <h2 ref={titleRef} contentEditable suppressContentEditableWarning
          onBlur={e => { setTitle(e.currentTarget.textContent); save({ title: e.currentTarget.textContent }); }}
          style={{ margin: 0, fontSize: '18px', fontWeight: 700, outline: 'none', color: S.text }}>
          {title}
        </h2>
        <div ref={authorRef} contentEditable suppressContentEditableWarning
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
              <td style={{ border: S.border, padding: 0, background: S.bgTextArea }}>
                <RichTextEditor
                  value={val}
                  onChange={html => { set(html); save({ [key]: html }); }}
                  minHeight={h}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
