const express = require('express');
const router = express.Router();
const db = require('../db');

// 会計年度（9月始まり）で past-month の forecast 案件を done に自動更新
function autoUpdatePastForecasts() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const fiscalStartYear = m >= 9 ? y : y - 1;

  const forecasts = db.prepare(
    "SELECT id, inspection_date FROM deals WHERE status = 'forecast' AND inspection_date IS NOT NULL AND inspection_date != ''"
  ).all();

  for (const deal of forecasts) {
    const month = parseInt(deal.inspection_date.replace('月検収', ''));
    if (isNaN(month)) continue;
    const dealYear = month >= 9 ? fiscalStartYear : fiscalStartYear + 1;
    // 検収月が現在月より前なら done に更新
    if (dealYear < y || (dealYear === y && month < m)) {
      db.prepare("UPDATE deals SET status = 'done' WHERE id = ?").run(deal.id);
    }
  }
}

// 一覧取得（顧客名付き、customer_idでフィルタ可能）
router.get('/', (req, res) => {
  autoUpdatePastForecasts();
  const { customer_id } = req.query;
  const deals = customer_id
    ? db.prepare(`
        SELECT deals.*, customers.company as customer_name
        FROM deals
        JOIN customers ON deals.customer_id = customers.id
        WHERE deals.customer_id = ? AND (deals.is_project IS NULL OR deals.is_project = 0)
        ORDER BY deals.sort_order ASC
      `).all(customer_id)
    : db.prepare(`
        SELECT deals.*, customers.company as customer_name
        FROM deals
        JOIN customers ON deals.customer_id = customers.id
        WHERE deals.is_project IS NULL OR deals.is_project = 0
        ORDER BY deals.sort_order ASC
      `).all();
  res.json(deals);
});

// 登録
router.post('/', (req, res) => {
  const { customer_id, title, amount, status, inspection_date, topics, is_project } = req.body;
  if (!customer_id || !title) return res.status(400).json({ error: '顧客と案件名は必須です' });
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM deals').get().m;
  const result = db.prepare(
    'INSERT INTO deals (customer_id, title, amount, status, inspection_date, topics, sort_order, is_project) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(customer_id, title, amount || 0, status || 'proposing', inspection_date || null, topics || null, maxOrder + 1, is_project ? 1 : 0);
  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(deal);
});

// 更新
router.patch('/:id', (req, res) => {
  const { status, title, amount, customer_id } = req.body;
  const current = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: '案件が見つかりません' });
  const { inspection_date, topics } = req.body;
  db.prepare('UPDATE deals SET customer_id=?, title=?, amount=?, status=?, inspection_date=?, topics=? WHERE id=?').run(
    customer_id ?? current.customer_id,
    title ?? current.title,
    amount ?? current.amount,
    status ?? current.status,
    inspection_date ?? current.inspection_date,
    topics ?? current.topics,
    req.params.id
  );
  res.json({ success: true });
});

// 複製（複製元の直下に挿入）
router.post('/duplicate/:id', (req, res) => {
  const original = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
  if (!original) return res.status(404).json({ error: '案件が見つかりません' });
  // 複製元より後ろのsort_orderを1つずらす
  db.prepare('UPDATE deals SET sort_order = sort_order + 1 WHERE sort_order > ?').run(original.sort_order);
  // 複製元の直後に挿入
  const result = db.prepare(
    'INSERT INTO deals (customer_id, title, amount, status, inspection_date, topics, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(original.customer_id, original.title, original.amount, original.status, original.inspection_date, original.topics, original.sort_order + 1);
  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(deal);
});

// 並び順更新
router.post('/reorder', (req, res) => {
  const { ids } = req.body;
  const update = db.prepare('UPDATE deals SET sort_order = ? WHERE id = ?');
  ids.forEach((id, index) => update.run(index, id));
  res.json({ success: true });
});

// 削除
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '案件が見つかりません' });
  res.json({ success: true });
});

module.exports = router;
