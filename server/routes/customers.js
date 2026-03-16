const express = require('express');
const router = express.Router();
const db = require('../db');

// 一覧取得
router.get('/', (req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY sort_order ASC').all();
  res.json(customers);
});

// 登録
router.post('/', (req, res) => {
  const { company, phone, postal_code, prefecture, address, building, url } = req.body;
  if (!company) return res.status(400).json({ error: '会社名は必須です' });
  const result = db.prepare(
    'INSERT INTO customers (name, phone, company, postal_code, prefecture, address, building, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(company, phone || null, company, postal_code || null, prefecture || null, address || null, building || null, url || null);
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(customer);
});

// 1件取得
router.get('/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: '顧客が見つかりません' });
  res.json(customer);
});

// 更新
router.patch('/:id', (req, res) => {
  const { company, phone, postal_code, prefecture, address, building, url, sasuke_id } = req.body;
  if (!company) return res.status(400).json({ error: '会社名は必須です' });
  db.prepare(
    'UPDATE customers SET name=?, company=?, phone=?, postal_code=?, prefecture=?, address=?, building=?, url=?, sasuke_id=? WHERE id=?'
  ).run(company, company, phone || null, postal_code || null, prefecture || null, address || null, building || null, url || null, sasuke_id || null, req.params.id);
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  res.json(customer);
});

// 並び順更新
router.post('/reorder', (req, res) => {
  const { ids } = req.body; // 順番通りのidの配列
  const update = db.prepare('UPDATE customers SET sort_order = ? WHERE id = ?');
  ids.forEach((id, index) => update.run(index, id));
  res.json({ success: true });
});

// 削除
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM deals WHERE customer_id = ?').run(req.params.id);
  const result = db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '顧客が見つかりません' });
  res.json({ success: true });
});

module.exports = router;
