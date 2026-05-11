const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM customer_scoring ORDER BY created_at DESC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { customer_name, product_name, assignee, visitor, last_visit_date, claim_status, ticket_status, score, notes } = req.body;
  const result = db.prepare(
    'INSERT INTO customer_scoring (customer_name, product_name, assignee, visitor, last_visit_date, claim_status, ticket_status, score, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(customer_name || '', product_name || '', assignee || '', visitor || '', last_visit_date || '', claim_status || '', ticket_status || '', score || 3, notes || '');
  res.status(201).json(db.prepare('SELECT * FROM customer_scoring WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM customer_scoring WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '見つかりません' });
  res.json(row);
});

router.put('/:id', (req, res) => {
  const { customer_name, product_name, assignee, visitor, last_visit_date, claim_status, ticket_status, score, notes } = req.body;
  db.prepare(
    'UPDATE customer_scoring SET customer_name=?, product_name=?, assignee=?, visitor=?, last_visit_date=?, claim_status=?, ticket_status=?, score=?, notes=? WHERE id=?'
  ).run(customer_name || '', product_name || '', assignee || '', visitor || '', last_visit_date || '', claim_status || '', ticket_status || '', score || 3, notes || '', req.params.id);
  res.json(db.prepare('SELECT * FROM customer_scoring WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM customer_scoring WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: '見つかりません' });
  res.json({ success: true });
});

module.exports = router;
