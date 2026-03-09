const express = require('express');
const router = express.Router();
const db = require('../db');

// 一覧取得
router.get('/', (req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
  res.json(customers);
});

// 登録
router.post('/', (req, res) => {
  const { name, email, phone, company } = req.body;
  if (!name) return res.status(400).json({ error: '名前は必須です' });
  const result = db.prepare(
    'INSERT INTO customers (name, email, phone, company) VALUES (?, ?, ?, ?)'
  ).run(name, email || null, phone || null, company || null);
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(customer);
});

// 削除
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM deals WHERE customer_id = ?').run(req.params.id);
  const result = db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '顧客が見つかりません' });
  res.json({ success: true });
});

module.exports = router;
