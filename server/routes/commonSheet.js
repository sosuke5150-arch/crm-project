const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');

const upload = multer({ storage: multer.memoryStorage() });

// 画像解析エンドポイント
router.post('/analyze-image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: '画像が指定されていません' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, error: 'ANTHROPIC_API_KEY が設定されていません' });

  try {
    const client = new Anthropic({ apiKey });
    const base64 = req.file.buffer.toString('base64');
    const mediaType = req.file.mimetype;

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: `この画像は営業月次報告書です。以下のフィールドをすべて抽出し、JSONのみを返してください（説明文は不要）。

{
  "title": "資料タイトル・会議名",
  "author": "著者・報告者名",
  "gaiyou": "概況のテキスト全文",
  "kadai": "課題のテキスト全文",
  "taisaku": "対策のテキスト全文",
  "jiyo_yosoku": "次月予測のテキスト全文",
  "table_data": {
    "tsuki": { "b25": "単月今期予算(千円)", "a25": "単月今期実績(千円)", "f25": "単月着地予測(千円)", "b24": "単月前期予算(千円)", "a24": "単月前期実績(千円)" },
    "q2":    { "b25": "四半期今期予算",    "a25": "四半期今期実績",    "f25": "四半期着地予測",    "b24": "四半期前期予算",    "a24": "四半期前期実績"    },
    "cum":   { "b25": "累積今期予算",      "a25": "累積今期実績",      "f25": "累積着地予測",      "b24": "累積前期予算",      "a24": "累積前期実績"      },
    "full":  { "b25": "通期今期予算",      "a25": "通期今期実績",      "f25": "通期着地予測",      "b24": "通期前期予算",      "a24": "通期前期実績"      }
  }
}

数値はカンマなしの整数文字列（千円単位）。該当データが画像にない場合はnullを返してください。` }
        ],
      }],
    });

    const text = response.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.json({ success: false, error: 'データを抽出できませんでした' });

    res.json({ success: true, data: JSON.parse(match[0]) });
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
