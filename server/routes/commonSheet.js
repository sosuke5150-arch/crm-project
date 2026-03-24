const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const sharp = require('sharp');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const upload = multer({ storage: multer.memoryStorage() });
const PY_SCRIPT = path.join(__dirname, '..', 'ocr_easy.py');
const PYTHON_BIN = process.env.PYTHON_PATH || 'python';

// EasyOCR（Python）でテキスト抽出
async function easyOcr(imageBuffer) {
  // 高解像度ほど精度が上がる。最低3000px幅になるよう拡大
  const meta = await sharp(imageBuffer).metadata();
  const targetWidth = Math.max(meta.width * 2, 2000);
  const pngBuffer = await sharp(imageBuffer)
    .resize(Math.round(targetWidth), null, { fit: 'inside', withoutEnlargement: false })
    .sharpen({ sigma: 1.0, m1: 1.5, m2: 2.0 })
    .png()
    .toBuffer();

  const tmpFile = path.join(os.tmpdir(), `crm_ocr_${Date.now()}.png`);
  fs.writeFileSync(tmpFile, pngBuffer);

  try {
    return await new Promise((resolve, reject) => {
      execFile(
        PYTHON_BIN,
        [PY_SCRIPT, tmpFile],
        { timeout: 120000, encoding: 'buffer', env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' } },
        (err, stdout, stderr) => {
          const out = stdout.toString('utf8').trim();
          if (err && !out) reject(new Error(stderr.toString('utf8').trim() || err.message));
          else resolve(out);
        }
      );
    });
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  }
}

// ===== OCRテキストのローカルパーサー（API不要）=====
function parseOcrLocal(text) {
  const result = {
    title: null, author: null,
    gaiyou: null, kadai: null, taisaku: null, jiyo_yosoku: null,
    tableData: {
      tsuki: { b25: '', a25: '', f25: '', b24: '', a24: '' },
      q2:    { b25: '', a25: '', f25: '', b24: '', a24: '' },
      cum:   { b25: '', a25: '', f25: '', b24: '', a24: '' },
      full:  { b25: '', a25: '', f25: '', b24: '', a24: '' },
    },
  };

  // --- Helper: キーワードからスペース許容の正規表現を生成 ---
  function kwRegex(word) {
    return new RegExp(word.split('').map(c =>
      c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    ).join('\\s*'));
  }

  // --- テキストセクション抽出 ---
  const textDefs = [
    { key: 'gaiyou',      words: ['概況'] },
    { key: 'kadai',       words: ['課題'] },
    { key: 'taisaku',     words: ['対策'] },
    { key: 'jiyo_yosoku', words: ['次月予測', '次月見通し'] },
  ];

  // 位置ベースでキーワードを検索（OCRのCJKスペース挿入に対応）
  const positions = [];
  textDefs.forEach(({ key, words }) => {
    words.forEach(word => {
      const re = kwRegex(word);
      const m = re.exec(text);
      if (m) positions.push({ key, idx: m.index, len: m[0].length });
    });
  });
  positions.sort((a, b) => a.idx - b.idx);

  const seenKeys = new Set();
  const uniquePos = positions.filter(({ key }) => {
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  // 各キーワード間のテキストを抽出
  const sectionContents = {};
  uniquePos.forEach(({ key, idx, len }, i) => {
    const endIdx = i + 1 < uniquePos.length ? uniquePos[i + 1].idx : text.length;
    const content = text.slice(idx + len, endIdx).replace(/^[\s:：\n\r]+/, '').trim();
    sectionContents[key] = content;
  });

  // ヘッダーが密集している場合（OCRがヘッダーをまとめて読み取った場合）の再分配
  const keysWithContent = uniquePos.filter(({ key }) => sectionContents[key] && sectionContents[key].trim());
  const keysWithout = uniquePos.filter(({ key }) => !sectionContents[key] || !sectionContents[key].trim());
  if (keysWithout.length >= 2 && keysWithContent.length >= 1) {
    // コンテンツが集まっているセクションを特定
    const contentKey = keysWithContent.reduce((best, cur) =>
      (sectionContents[cur.key] || '').length > (sectionContents[best.key] || '').length ? cur : best
    ).key;
    const allContent = sectionContents[contentKey] || '';
    const contentLines = allContent.split(/\r?\n/).map(l => l.trim()).filter(l => l);

    const assigned = { gaiyou: [], kadai: [], taisaku: [], jiyo_yosoku: [] };
    let phase = 'start';

    for (const line of contentLines) {
      const stripped = line.replace(/\s+/g, '');

      if (phase === 'start' || phase === 'gaiyou') {
        if (/^[・●▪]/.test(stripped)) {
          phase = 'gaiyou';
          assigned.gaiyou.push(line);
        } else if (/^[①②③④⑤]/.test(stripped)) {
          phase = 'kadai';
          assigned.kadai.push(line);
        } else if (phase === 'gaiyou') {
          assigned.gaiyou.push(line);
        }
      } else if (phase === 'kadai') {
        if (/^[①②③④⑤]/.test(stripped) && assigned.kadai.length > 0) {
          // 課題に既に項目がある状態で再度①が来たら対策の開始
          // ただし連続番号（②③）なら課題の続き
          const lastKadai = assigned.kadai[assigned.kadai.length - 1].replace(/\s+/g, '');
          const lastNum = lastKadai.match(/^[①②③④⑤]/);
          const curNum = stripped.match(/^[①②③④⑤]/);
          if (lastNum && curNum && curNum[0] <= lastNum[0]) {
            // 番号が戻った → 対策の開始
            phase = 'taisaku';
            assigned.taisaku.push(line);
          } else {
            assigned.kadai.push(line);
          }
        } else if (/^→/.test(stripped)) {
          phase = 'taisaku';
          assigned.taisaku.push(line);
        } else {
          // 番号なし・矢印なし → 次月予測の可能性
          phase = 'jiyo_check';
          assigned.jiyo_yosoku.push(line);
        }
      } else if (phase === 'jiyo_check') {
        if (/^[①②③④⑤]/.test(stripped) || /^→/.test(stripped)) {
          phase = 'taisaku';
          assigned.taisaku.push(line);
        } else {
          assigned.jiyo_yosoku.push(line);
        }
      } else if (phase === 'taisaku') {
        assigned.taisaku.push(line);
      }
    }

    // 再分配結果を適用（元のコンテンツキーをクリア）
    sectionContents[contentKey] = '';
    for (const { key } of textDefs) {
      if (assigned[key].length > 0) sectionContents[key] = assigned[key].join('\n');
    }
  }

  for (const { key } of textDefs) {
    if (sectionContents[key]) result[key] = sectionContents[key];
  }

  // --- テーブル数値抽出 ---
  function normLine(line) {
    let s = line;
    s = s.replace(/(\d)[：:「」\[\]【】（）\(\)·・]/g, '$1');
    let prev;
    do { prev = s; s = s.replace(/(\d)\s+(\d)/g, '$1$2'); } while (s !== prev);
    s = s.replace(/[,，]/g, '');
    return s;
  }

  function extractAmounts(line) {
    if (/%/.test(line)) return [];
    const normalized = normLine(line);
    if (/^[ーー\-]/.test(normalized)) return [];
    const matches = normalized.match(/\d+/g) || [];
    return matches.filter(m => {
      if (m.length < 3 || m.length > 7) return false;
      const n = parseInt(m);
      if (n >= 2000 && n <= 2100) return false;
      if (n < 100) return false;
      return true;
    });
  }

  const lines = text.split(/\r?\n/).map(l => l.trim());

  // --- 方式1: セクション境界ベース ---
  const sectionDefs = [
    { id: 'tsuki', re: /単\s*月/ },
    { id: 'q2',    re: /[四4]\s*半\s*期?/ },
    { id: 'cum',   re: /累\s*[積計]|期\s*初.*累/ },
    { id: 'full',  re: /通\s*期/ },
  ];

  const sectionBoundaries = [];
  lines.forEach((line, i) => {
    sectionDefs.forEach(({ id, re }) => {
      if (re.test(line) && !sectionBoundaries.find(s => s.id === id)) {
        sectionBoundaries.push({ id, start: i });
      }
    });
  });
  sectionBoundaries.sort((a, b) => a.start - b.start);

  let sectionDataCount = 0;
  sectionBoundaries.forEach(({ id, start }, idx) => {
    const end = idx + 1 < sectionBoundaries.length ? sectionBoundaries[idx + 1].start : lines.length;
    const secLines = lines.slice(start, end);

    const lines25 = secLines.filter(l => /(?:第\s*)?25\s*期/.test(l));
    const lines24 = secLines.filter(l => /(?:第\s*)?24\s*期/.test(l));

    let amounts25 = lines25.flatMap(l => extractAmounts(l));
    let amounts24 = lines24.flatMap(l => extractAmounts(l));

    if (amounts25.length === 0 && amounts24.length === 0) {
      const allAmounts = secLines.flatMap(l => extractAmounts(l));
      if (allAmounts.length >= 5) {
        amounts25 = allAmounts.slice(0, 3);
        amounts24 = allAmounts.slice(3, 5);
      } else if (allAmounts.length >= 2) {
        const split = Math.ceil(allAmounts.length / 2);
        amounts25 = allAmounts.slice(0, split);
        amounts24 = allAmounts.slice(split);
      }
    }

    if (amounts25.length > 0 || amounts24.length > 0) sectionDataCount++;
    if (amounts25[0]) result.tableData[id].b25 = amounts25[0];
    if (amounts25[1]) result.tableData[id].a25 = amounts25[1];
    if (amounts25[2]) result.tableData[id].f25 = amounts25[2];
    if (amounts24[0]) result.tableData[id].b24 = amounts24[0];
    if (amounts24[1]) result.tableData[id].a24 = amounts24[1];
  });

  // --- 方式2: 列ヘッダー + 金額(千円)ブロックベース ---
  if (sectionDataCount < 2) {
    ['tsuki', 'q2', 'cum', 'full'].forEach(id => {
      result.tableData[id] = { b25: '', a25: '', f25: '', b24: '', a24: '' };
    });

    const rowMap = [
      { section: 'tsuki', period: '25' },
      { section: 'tsuki', period: '24' },
      { section: 'q2',    period: '25' },
      { section: 'q2',    period: '24' },
      { section: 'cum',   period: '25' },
      { section: 'cum',   period: '24' },
      { section: 'full',  period: '25' },
      { section: 'full',  period: '24' },
    ];

    // 列データ収集: ヘッダー→金額(千円)の前後で値を集め、重複除去
    function collectColumn(headerRe, excludeRe) {
      const headerIdx = lines.findIndex((l, i) => {
        if (excludeRe && excludeRe.test(l)) return false;
        return headerRe.test(l);
      });
      if (headerIdx === -1) return [];

      // ヘッダーからブロック終端を検出
      let endIdx = lines.length;
      for (let i = headerIdx + 1; i < lines.length; i++) {
        if (/昨\s*対/.test(lines[i])) { endIdx = i; break; }
        if (/実\s*績\s*差/.test(lines[i])) { endIdx = i; break; }
        if (/対\s*予\s*算/.test(lines[i])) { endIdx = i; break; }
        if (/概\s*況|課\s*題|対\s*策|次\s*月/.test(lines[i])) { endIdx = i; break; }
        // 別の列ヘッダー
        if (i > headerIdx + 1 && /予\s*算/.test(lines[i]) && !/対\s*予\s*算/.test(lines[i])) { endIdx = i; break; }
        if (i > headerIdx + 1 && /実\s*績/.test(lines[i]) && !/実\s*績\s*差/.test(lines[i])) { endIdx = i; break; }
      }

      // 金額(千円)の位置を検出
      let kingakuIdx = -1;
      for (let i = headerIdx + 1; i < endIdx; i++) {
        if (/金\s*額.*千\s*円/.test(lines[i])) { kingakuIdx = i; break; }
      }

      // 金額(千円)の前後で値を収集
      const preAmounts = [];
      const postAmounts = [];
      for (let i = headerIdx + 1; i < endIdx; i++) {
        if (/金\s*額|千\s*円/.test(lines[i])) continue;
        if (/%/.test(lines[i])) continue;
        const amounts = extractAmounts(lines[i]);
        if (kingakuIdx !== -1 && i < kingakuIdx) {
          preAmounts.push(...amounts);
        } else if (kingakuIdx !== -1 && i > kingakuIdx) {
          postAmounts.push(...amounts);
        } else {
          postAmounts.push(...amounts);
        }
      }

      // post の先頭が pre と同じなら重複 → スキップ
      let skip = 0;
      if (preAmounts.length > 0 && postAmounts.length >= preAmounts.length) {
        const allMatch = preAmounts.every((v, i) => postAmounts[i] === v);
        if (allMatch) skip = preAmounts.length;
      }
      const combined = [...preAmounts, ...postAmounts.slice(skip)];

      // 連続する重複ペアを除去（OCRが同じセルを2回読む場合）
      const deduped = [];
      for (let i = 0; i < combined.length; i++) {
        if (i >= 2 && combined[i] === combined[i - 2] && combined[i - 1] === combined[i + 1 < combined.length ? i + 1 : -1]) {
          // 2つ前と同じペアパターン → スキップ
          i++; // ペアの2番目もスキップ
          continue;
        }
        deduped.push(combined[i]);
      }

      return deduped;
    }

    // 予算(b)列
    const budgetValues = collectColumn(/予\s*算/, /対\s*予\s*算/);
    rowMap.forEach((row, i) => {
      if (budgetValues[i]) result.tableData[row.section]['b' + row.period] = budgetValues[i];
    });

    // 実績(a)列
    const actualValues = collectColumn(/実\s*績/, /実\s*績\s*差/);
    rowMap.forEach((row, i) => {
      if (actualValues[i]) result.tableData[row.section]['a' + row.period] = actualValues[i];
    });

    // 着地予測(f)列: 最後の金額(千円)ブロックから取得
    const kingakuPositions = [];
    lines.forEach((l, i) => { if (/金\s*額.*千\s*円/.test(l)) kingakuPositions.push(i); });
    if (kingakuPositions.length > 0) {
      const lastKingaku = kingakuPositions[kingakuPositions.length - 1];
      const fValues = [];
      for (let i = lastKingaku + 1; i < lines.length; i++) {
        if (/[%％]/.test(lines[i])) break;
        if (/概\s*況|課\s*題|対\s*策|次\s*月/.test(lines[i])) break;
        if (/金\s*額.*千\s*円/.test(lines[i])) break;
        if (/昨\s*対|対\s*予\s*算|進\s*捗/.test(lines[i])) break;
        const amounts = extractAmounts(lines[i]);
        fValues.push(...amounts);
      }
      // 予算・実績と重複しない値のみ着地予測とする
      const usedValues = new Set();
      ['tsuki', 'q2', 'cum', 'full'].forEach(id => {
        Object.values(result.tableData[id]).forEach(v => { if (v) usedValues.add(v); });
      });
      const uniqueF = fValues.filter(v => !usedValues.has(v));
      if (uniqueF.length >= 2) {
        // 大きい方=full、小さい方=q2（通期着地 ≧ 四半期着地）
        const sorted = [...uniqueF].sort((a, b) => parseInt(b) - parseInt(a));
        result.tableData.full.f25 = sorted[0];
        result.tableData.q2.f25 = sorted[1];
      } else if (uniqueF.length === 1) {
        result.tableData.full.f25 = uniqueF[0];
      }
    }
  }

  // --- タイトル・著者抽出（linesが宣言された後で実行）---
  const cleanLines = lines.map(l => l.replace(/\s+/g, ''));
  // タイトル: "25期4月全体会議（3月報告）" のようなパターン
  const titleLine = lines.find((l, i) => i < 15 && /\d+期.*会議/.test(cleanLines[i]));
  if (titleLine) result.title = titleLine.trim();
  // 著者: コロン（：）を含む行
  const authorLine = lines.find((l, i) => i < 20 && /[：:]/.test(cleanLines[i]) && cleanLines[i].length > 5 && !/会議|報告/.test(cleanLines[i]));
  if (authorLine) result.author = authorLine.trim();

  return result;
}

// 画像解析エンドポイント（Windows OCR + ローカルパーサー）
router.post('/analyze-image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: '画像が指定されていません' });

  try {
    const ocrText = await easyOcr(req.file.buffer);
    const parsed = parseOcrLocal(ocrText);
    const fs2 = require('fs');
    fs2.writeFileSync('C:/Users/ikuta/test/crm-project/server/ocr_debug.log',
      '=== OCR TEXT ===\n' + ocrText + '\n=== PARSED RESULT ===\n' + JSON.stringify(parsed, null, 2) + '\n');
    res.json({ success: true, text: ocrText, parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

db.exec(`CREATE TABLE IF NOT EXISTS common_sheet (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
)`);

// デフォルト値の投入
const exists = db.prepare("SELECT 1 FROM common_sheet WHERE key='title'").get();
if (!exists) {
  const ins = db.prepare('INSERT OR REPLACE INTO common_sheet (key, value) VALUES (?, ?)');
  [
    ['title',        '25期3月全体会議（2月報告）'],
    ['author',       '開発（マイナビ＋開発案件）：生田目 真史'],
    ['gaiyou',       '・2月は岩倉建設、セルコホームの仕掛計上を合わせて、目標1,470万円に対して1,967万円を計上、2月単月では497万円のプラスとなった。\n・上期の受託開発の実績は5,477万円、予算4,247万円に対して1,230万円のプラスで折り返すこととなった。\n・マイナビ保守開発は1月〜3月までの3か月間も昨年と同等額（308万円）で行う見通し。4月から想定していた予算（220万円）となる。\n・アマゾン各事業部から見積の引き合い要請あり。'],
    ['kadai',        '①ササキ商品管理システムの保守契約変更\n②岩倉建設WorksAI-OCR精度問題と業務分析システム開発進捗\n③セルコホーム要件定義スタート〜サスケ環境移植\n④一建設との顧客紹介契約を準備中'],
    ['taisaku',      '①ササキ商品管理システムの保守契約変更\n→2026年3月1日に締結完了（日本ソフト販売を介さず、ササキとの直接契約となる）\n②岩倉建設WorksAI-OCR精度問題と業務分析システム開発進捗\n→2/24の訪問打合せで、双方の状況を共有。システムのモック提案の実施を行い、心理的なストレスを取り除くことができた。現在WorksAI-OCRの精度も改善のめどが立っている。\n③セルコホーム要件定義スタート〜サスケ環境移植\n→セルコ内部での要件が固まっておらず難航していたが、2月末にサスケ専用環境の移植を実施、以後これをベースに具体的な打合せができる見込み。\n④一建設との顧客紹介契約を準備中\n→2月末に内容的な確認が取れ、現在締結に向けて進行中（3月締結予定）'],
    ['jiyo_yosoku',  'マイナビ保守開発で88万円のプラス。ほか検収完了が見込まれる開発はありません。ササキの商品検索システム保守がスタート（5万円/月）'],
    ['table_data',   JSON.stringify({
      tsuki: { b25: '14700', a25: '19668', f25: '',      b24: '7960',  a24: '8070'  },
      q2:    { b25: '27492', a25: '36527', f25: '36527', b24: '20272', a24: '13272' },
      cum:   { b25: '42472', a25: '54772', f25: '',      b24: '35772', a24: '41926' },
      full:  { b25: '93772', a25: '54772', f25: '95826', b24: '79632', a24: '41926' },
    })],
  ].forEach(([key, value]) => ins.run(key, value));
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM common_sheet').all();
  const data = {};
  rows.forEach(r => { data[r.key] = r.value; });
  res.json(data);
});

router.post('/', (req, res) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO common_sheet (key, value) VALUES (?, ?)');
  Object.entries(req.body).forEach(([key, value]) => stmt.run(key, String(value ?? '')));
  res.json({ success: true });
});

module.exports = router;
