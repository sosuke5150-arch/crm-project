const express = require('express');
const router = express.Router();
const db = require('../db');

// 一覧取得（顧客名付き、customer_idでフィルタ可能）
router.get('/', (req, res) => {
  const { customer_id } = req.query;
  const deals = customer_id
    ? db.prepare(`
        SELECT deals.*, customers.company as customer_name
        FROM deals
        JOIN customers ON deals.customer_id = customers.id
        WHERE deals.customer_id = ?
        ORDER BY deals.sort_order ASC
      `).all(customer_id)
    : db.prepare(`
        SELECT deals.*, customers.company as customer_name
        FROM deals
        JOIN customers ON deals.customer_id = customers.id
        ORDER BY deals.sort_order ASC
      `).all();
  res.json(deals);
});

// 登録
router.post('/', (req, res) => {
  const { customer_id, title, amount, status, inspection_date, topics } = req.body;
  if (!customer_id || !title) return res.status(400).json({ error: '顧客と案件名は必須です' });
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM deals').get().m;
  const result = db.prepare(
    'INSERT INTO deals (customer_id, title, amount, status, inspection_date, topics, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(customer_id, title, amount || 0, status || 'proposing', inspection_date || null, topics || null, maxOrder + 1);
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
