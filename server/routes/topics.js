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
    const { section = '既存顧客案件', customer = '', project = '', status = '', amount = '', inspection_date = '', topics = '', row_color = '' } = req.body;
    const maxRow = db.prepare('SELECT MAX(sort_order) as m FROM topics_items WHERE section = ?').get(section);
    const nextOrder = (maxRow?.m || 0) + 1;
    const result = db.prepare(
      'INSERT INTO topics_items (section, customer, project, status, amount, inspection_date, topics, sort_order, row_color) VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(section, customer, project, status, amount, inspection_date, topics, nextOrder, row_color);
    const newItem = db.prepare('SELECT * FROM topics_items WHERE id = ?').get(result.lastInsertRowid);
    res.json(newItem);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST duplicate
router.post('/duplicate/:id', (req, res) => {
  try {
    const src = db.prepare('SELECT * FROM topics_items WHERE id = ?').get(req.params.id);
    if (!src) return res.status(404).json({ error: 'not found' });
    db.prepare('UPDATE topics_items SET sort_order = sort_order + 1 WHERE section = ? AND sort_order > ?').run(src.section, src.sort_order);
    const result = db.prepare(
      'INSERT INTO topics_items (section, customer, project, status, amount, inspection_date, topics, sort_order) VALUES (?,?,?,?,?,?,?,?)'
    ).run(src.section, src.customer, src.project, src.status, src.amount, src.inspection_date, src.topics, src.sort_order + 1);
    res.json(db.prepare('SELECT * FROM topics_items WHERE id = ?').get(result.lastInsertRowid));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST reorder
router.post('/reorder', (req, res) => {
  try {
    const { ids } = req.body;
    const stmt = db.prepare('UPDATE topics_items SET sort_order = ? WHERE id = ?');
    ids.forEach((id, i) => stmt.run(i + 1, id));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update item
router.put('/:id', (req, res) => {
  try {
    const { section = '既存顧客案件', customer = '', project = '', status = '', amount = '', inspection_date = '', topics = '', row_color = '' } = req.body;
    db.prepare(
      'UPDATE topics_items SET section=?, customer=?, project=?, status=?, amount=?, inspection_date=?, topics=?, row_color=? WHERE id=?'
    ).run(section, customer, project, status, amount, inspection_date, topics, row_color, req.params.id);
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
