const express = require('express');
const router = express.Router();
const db = require('../db');

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
