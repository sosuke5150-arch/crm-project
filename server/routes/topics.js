const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all items
router.get('/', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM topics_items ORDER BY section, sort_order, id').all();
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST new item
router.post('/', (req, res) => {
  try {
    const { section = '既存顧客案件', customer = '', project = '', status = '', amount = '', inspection_date = '', topics = '' } = req.body;
    const maxRow = db.prepare('SELECT MAX(sort_order) as m FROM topics_items WHERE section = ?').get(section);
    const nextOrder = (maxRow?.m || 0) + 1;
    const result = db.prepare(
      'INSERT INTO topics_items (section, customer, project, status, amount, inspection_date, topics, sort_order) VALUES (?,?,?,?,?,?,?,?)'
    ).run(section, customer, project, status, amount, inspection_date, topics, nextOrder);
    const newItem = db.prepare('SELECT * FROM topics_items WHERE id = ?').get(result.lastInsertRowid);
    res.json(newItem);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update item
router.put('/:id', (req, res) => {
  try {
    const { customer = '', project = '', status = '', amount = '', inspection_date = '', topics = '' } = req.body;
    db.prepare(
      'UPDATE topics_items SET customer=?, project=?, status=?, amount=?, inspection_date=?, topics=? WHERE id=?'
    ).run(customer, project, status, amount, inspection_date, topics, req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE item
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM topics_items WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
