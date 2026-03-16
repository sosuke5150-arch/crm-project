const express = require('express');
const router = express.Router();
const db = require('../db');

// シンプルなキーバリューテーブル
db.exec(`CREATE TABLE IF NOT EXISTS notes_kv (
  key TEXT PRIMARY KEY,
  content TEXT NOT NULL DEFAULT ''
)`);

// 初期データ投入
const budgetExists = db.prepare("SELECT 1 FROM notes_kv WHERE key='budget'").get();
if (!budgetExists) {
  // 旧notesテーブルのデータを結合して移行
  let budgetContent = '';
  let policyContent = '';
  try {
    const oldBudget = db.prepare("SELECT content, type FROM notes WHERE section='budget' ORDER BY sort_order ASC").all();
    const oldPolicy = db.prepare("SELECT content, type FROM notes WHERE section='policy' ORDER BY sort_order ASC").all();
    budgetContent = oldBudget.map(n => (n.type === 'note' ? '※' : '・') + n.content).join('\n\n');
    policyContent = oldPolicy.map(n => (n.type === 'note' ? '※' : '・') + n.content).join('\n\n');
  } catch (e) {}

  if (!budgetContent) {
    budgetContent = [
      '・2025年7月、予算検討会議にて、25期受託開発予算を8600万円で上申。内訳はマイナビ2800万円、ケイコーポ3000万円、受託2800万円。\n　同会議にて上記予算に210万円を上積みされ、25期受託開発予算8810万円で決定となる。その内開発案件予算は3010万円。',
      '※資料内の来期売上イメージ（根拠なし）の金額がそのまま上積みされる形となってしまった。',
      '・25年8月、営業(Worksチーム)で年間で500万円分のWorks関連開発案件を取る？？という話が舞い込み、開発案件予算の8月に算入される。\n　よって25期売上全体表では8月の開発案件予算が1810万円→2310万円となっている。',
      '※こちらは受託チームとは別目標ということなので、受託開発の年間目標は当初予算8810万円で管理を行う。（上山部長に確認済み）',
      '・全体表では下期開発案件欄の各月に、根拠のない来期売上イメージ金額がそのまま予算として入っている。（予算組み立て時の認識齟齬により）',
      '※受託開発の性質上、基本的には上期（2月）、下期（8月）終了時点の状態を管理することとする。（上山部長に確認済み）',
    ].join('\n\n');
  }
  if (!policyContent) {
    policyContent = [
      '・25年11月、上場審査のため上期売上がカギとなる。そのため受託開発案件では上期目標の1200万円必達の上、\n　他事業の売上をカバーするため、500万円ほどのプラスで着地することが最高の結果。',
      '※セルコホーム、岩倉建設の仕掛計上管理が重要なポイントとなる。',
      '→仕掛計上の考え方（監査上の取り決め）について、管理部に要確認！',
    ].join('\n\n');
  }

  db.prepare("INSERT INTO notes_kv (key, content) VALUES (?, ?)").run('budget', budgetContent);
  db.prepare("INSERT INTO notes_kv (key, content) VALUES (?, ?)").run('policy', policyContent);
}

// { budget: '...', policy: '...' } 形式で返す
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM notes_kv').all();
  const result = {};
  rows.forEach(r => { result[r.key] = r.content; });
  res.json(result);
});

router.put('/:key', (req, res) => {
  const { content } = req.body;
  db.prepare('INSERT OR REPLACE INTO notes_kv (key, content) VALUES (?, ?)').run(req.params.key, content || '');
  res.json({ success: true });
});

router.delete('/:key', (req, res) => {
  db.prepare("INSERT OR REPLACE INTO notes_kv (key, content) VALUES (?, '')").run(req.params.key);
  res.json({ success: true });
});

module.exports = router;
