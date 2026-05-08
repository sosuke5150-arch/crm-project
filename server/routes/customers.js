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
  db.prepare('DELETE FROM customer_systems WHERE customer_id = ?').run(req.params.id);
  const result = db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '顧客が見つかりません' });
  res.json({ success: true });
});

// システム名一覧
router.get('/:id/systems', (req, res) => {
  const rows = db.prepare('SELECT * FROM customer_systems WHERE customer_id = ? ORDER BY id ASC').all(req.params.id);
  res.json(rows);
});

// 運用サービス追加
router.post('/:id/systems', (req, res) => {
  const { name, start_date, description, assignee } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'サービス名は必須です' });
  const result = db.prepare(
    'INSERT INTO customer_systems (customer_id, name, start_date, description, assignee) VALUES (?, ?, ?, ?, ?)'
  ).run(req.params.id, name.trim(), start_date || null, description || null, assignee || null);
  res.status(201).json({ id: result.lastInsertRowid, customer_id: Number(req.params.id), name: name.trim(), start_date: start_date || null, description: description || null, assignee: assignee || null });
});

// 運用サービス更新
router.patch('/:customerId/systems/:systemId', (req, res) => {
  const { name, start_date, description, assignee } = req.body;
  const current = db.prepare('SELECT * FROM customer_systems WHERE id = ? AND customer_id = ?').get(req.params.systemId, req.params.customerId);
  if (!current) return res.status(404).json({ error: '見つかりません' });
  db.prepare('UPDATE customer_systems SET name=?, start_date=?, description=?, assignee=? WHERE id=?').run(
    name ?? current.name, start_date ?? current.start_date, description ?? current.description, assignee ?? current.assignee, req.params.systemId
  );
  res.json({ success: true });
});

// 運用サービス削除
router.delete('/:customerId/systems/:systemId', (req, res) => {
  const result = db.prepare('DELETE FROM customer_systems WHERE id = ? AND customer_id = ?').run(req.params.systemId, req.params.customerId);
  if (result.changes === 0) return res.status(404).json({ error: '見つかりません' });
  res.json({ success: true });
});

module.exports = router;
