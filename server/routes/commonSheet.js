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
const PS_SCRIPT = path.join(__dirname, '..', 'ocr.ps1');

// Windows OCR（Windows.Media.Ocr）でテキスト抽出
async function windowsOcr(imageBuffer) {
  // Windows OCR は高解像度ほど精度が上がる。最低3000px幅になるよう拡大
  const meta = await sharp(imageBuffer).metadata();
  const targetWidth = Math.max(meta.width * 3, 3000);
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
        'powershell',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', PS_SCRIPT, tmpFile],
        { timeout: 30000, encoding: 'buffer' },
        (err, stdout, stderr) => {
          if (err) reject(new Error(stderr.toString('utf8') || err.message));
          else resolve(stdout.toString('utf8').trim());
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
    gaiyou: null, kadai: null, taisaku: null, jiyo_yosoku: null,
    tableData: {
      tsuki: { b25: '', a25: '', f25: '', b24: '', a24: '' },
      q2:    { b25: '', a25: '', f25: '', b24: '', a24: '' },
      cum:   { b25: '', a25: '', f25: '', b24: '', a24: '' },
      full:  { b25: '', a25: '', f25: '', b24: '', a24: '' },
    },
  };

  // --- テキストセクション抽出 ---
  // OCRでは「概況」「課題」「対策」「次月予測」が見出しとして登場する
  const textDefs = [
    { key: 'gaiyou',      words: ['概況'] },
    { key: 'kadai',       words: ['課題'] },
    { key: 'taisaku',     words: ['対策'] },
    { key: 'jiyo_yosoku', words: ['次月予測', '次月見通し'] },
  ];

  const positions = [];
  textDefs.forEach(({ key, words }) => {
    words.forEach(word => {
      const idx = text.indexOf(word);
      if (idx !== -1) positions.push({ key, idx, len: word.length });
    });
  });
  positions.sort((a, b) => a.idx - b.idx);

  const seenKeys = new Set();
  positions.forEach(({ key, idx, len }, i) => {
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    const endIdx = i + 1 < positions.length ? positions[i + 1].idx : text.length;
    const content = text.slice(idx + len, endIdx).replace(/^[\s:：\n\r]+/, '').trim();
    if (content) result[key] = content;
  });

  // --- テーブル数値抽出 ---
  // 数値正規化: "93 772" → "93772", "4：930" → "4930"
  function normLine(line) {
    let s = line;
    s = s.replace(/(\d)\s+(\d)/g, '$1$2');
    s = s.replace(/(\d)\s+(\d)/g, '$1$2'); // 2回適用（3グループ対応）
    s = s.replace(/[,，]/g, '');
    return s;
  }

  // 行から金額候補を抽出（4〜7桁の整数、年号2020-2100を除外）
  function extractAmounts(line) {
    const normalized = normLine(line);
    const matches = normalized.match(/\d+/g) || [];
    return matches.filter(m => {
      if (m.length < 4 || m.length > 7) return false;
      const n = parseInt(m);
      if (n >= 2000 && n <= 2100) return false; // 年号除外
      return n >= 1000;
    });
  }

  const lines = text.split(/\r?\n/).map(l => l.trim());

  // セクション境界を検出（最初に見つかった行を使用）
  const sectionDefs = [
    { id: 'tsuki', re: /単月/ },
    { id: 'q2',    re: /四半期|四半/ },
    { id: 'cum',   re: /累積|累計/ },
    { id: 'full',  re: /通期/ },
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

  sectionBoundaries.forEach(({ id, start }, idx) => {
    const end = idx + 1 < sectionBoundaries.length ? sectionBoundaries[idx + 1].start : lines.length;
    const secLines = lines.slice(start, end);

    // 25期行と24期行を探す
    const lines25 = secLines.filter(l => /25/.test(l) && !/24/.test(l));
    const lines24 = secLines.filter(l => /24/.test(l));

    let amounts25 = lines25.flatMap(l => extractAmounts(l));
    let amounts24 = lines24.flatMap(l => extractAmounts(l));

    // 行内に数値がない場合 → 数値が別行に出力されている可能性
    // セクション内の全数値を収集して、前半=25期、後半=24期と推定
    if (amounts25.length === 0 && amounts24.length === 0) {
      const allAmounts = secLines.flatMap(l => extractAmounts(l));
      const half = Math.ceil(allAmounts.length / 2);
      amounts25 = allAmounts.slice(0, half);
      amounts24 = allAmounts.slice(half);
    }

    // 列の割り当て: b25, a25, f25（着地予測、あれば3番目）
    if (amounts25[0]) result.tableData[id].b25 = amounts25[0];
    if (amounts25[1]) result.tableData[id].a25 = amounts25[1];
    if (amounts25[2]) result.tableData[id].f25 = amounts25[2];
    if (amounts24[0]) result.tableData[id].b24 = amounts24[0];
    if (amounts24[1]) result.tableData[id].a24 = amounts24[1];
  });

  return result;
}

// 画像解析エンドポイント（Windows OCR + ローカルパーサー）
router.post('/analyze-image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: '画像が指定されていません' });

  try {
    const ocrText = await windowsOcr(req.file.buffer);
    const parsed = parseOcrLocal(ocrText);
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
