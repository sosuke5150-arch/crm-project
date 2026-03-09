const express = require('express');
const router = express.Router();
const db = require('../db');

// 一覧取得（顧客名付き、customer_idでフィルタ可能）
router.get('/', (req, res) => {
  const { customer_id } = req.query;
  const deals = customer_id
    ? db.prepare(`
        SELECT deals.*, customers.name as customer_name
        FROM deals
        JOIN customers ON deals.customer_id = customers.id
        WHERE deals.customer_id = ?
        ORDER BY deals.created_at DESC
      `).all(customer_id)
    : db.prepare(`
        SELECT deals.*, customers.name as customer_name
        FROM deals
        JOIN customers ON deals.customer_id = customers.id
        ORDER BY deals.created_at DESC
      `).all();
  res.json(deals);
});

// 登録
router.post('/', (req, res) => {
  const { customer_id, title, amount, status } = req.body;
  if (!customer_id || !title) return res.status(400).json({ error: '顧客と案件名は必須です' });
  const result = db.prepare(
    'INSERT INTO deals (customer_id, title, amount, status) VALUES (?, ?, ?, ?)'
  ).run(customer_id, title, amount || 0, status || 'open');
  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(deal);
});

// ステータス更新
router.patch('/:id', (req, res) => {
  const { status } = req.body;
  const result = db.prepare('UPDATE deals SET status = ? WHERE id = ?').run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '案件が見つかりません' });
  res.json({ success: true });
});

// 削除
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '案件が見つかりません' });
  res.json({ success: true });
});

module.exports = router;
