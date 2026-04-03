const express = require('express');
const router = express.Router();
const db = require('../db');

// ===== テーブル初期化 =====
db.exec(`
  CREATE TABLE IF NOT EXISTS outsourcing_bps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    note TEXT DEFAULT '',
    highlight_color TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS outsourcing_amounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bp_id INTEGER NOT NULL,
    year_month TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    UNIQUE(bp_id, year_month, type)
  );
  CREATE TABLE IF NOT EXISTS outsourcing_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bp_id INTEGER NOT NULL,
    year_month TEXT NOT NULL,
    task_name TEXT DEFAULT '',
    task_color TEXT DEFAULT '',
    UNIQUE(bp_id, year_month)
  );
  CREATE TABLE IF NOT EXISTS outsourcing_settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
  );
`);

db.prepare("INSERT OR IGNORE INTO outsourcing_settings (key, value) VALUES ('annual_budget', '0')").run();

// GET /outsourcing/data
router.get('/data', (req, res) => {
  const bps     = db.prepare('SELECT * FROM outsourcing_bps ORDER BY sort_order, id').all();
  const amounts = db.prepare('SELECT * FROM outsourcing_amounts').all();
  const tasks   = db.prepare('SELECT * FROM outsourcing_tasks').all();
  const settings = {};
  db.prepare('SELECT * FROM outsourcing_settings').all().forEach(r => { settings[r.key] = r.value; });
  res.json({ bps, amounts, tasks, settings });
});

// POST /outsourcing/bp
router.post('/bp', (req, res) => {
  const { name, note = '', highlight_color = '' } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM outsourcing_bps').get().m;
  const result = db.prepare(
    'INSERT INTO outsourcing_bps (name, note, highlight_color, sort_order) VALUES (?, ?, ?, ?)'
  ).run(name, note, highlight_color, maxOrder + 1);
  res.json({ id: result.lastInsertRowid, name, note, highlight_color, sort_order: maxOrder + 1 });
});

// PUT /outsourcing/bp/:id
router.put('/bp/:id', (req, res) => {
  const { name, note, highlight_color } = req.body;
  db.prepare('UPDATE outsourcing_bps SET name=?, note=?, highlight_color=? WHERE id=?')
    .run(name, note || '', highlight_color || '', req.params.id);
  res.json({ ok: true });
});

// DELETE /outsourcing/bp/:id
router.delete('/bp/:id', (req, res) => {
  const id = req.params.id;
  db.prepare('DELETE FROM outsourcing_bps WHERE id=?').run(id);
  db.prepare('DELETE FROM outsourcing_amounts WHERE bp_id=?').run(id);
  db.prepare('DELETE FROM outsourcing_tasks WHERE bp_id=?').run(id);
  res.json({ ok: true });
});

// PUT /outsourcing/amount (upsert)
router.put('/amount', (req, res) => {
  const { bp_id, year_month, type, amount } = req.body;
  db.prepare(`
    INSERT INTO outsourcing_amounts (bp_id, year_month, type, amount)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(bp_id, year_month, type) DO UPDATE SET amount=excluded.amount
  `).run(bp_id, year_month, type, amount);
  res.json({ ok: true });
});

// PUT /outsourcing/task (upsert)
router.put('/task', (req, res) => {
  const { bp_id, year_month, task_name, task_color } = req.body;
  db.prepare(`
    INSERT INTO outsourcing_tasks (bp_id, year_month, task_name, task_color)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(bp_id, year_month) DO UPDATE SET task_name=excluded.task_name, task_color=excluded.task_color
  `).run(bp_id, year_month, task_name || '', task_color || '');
  res.json({ ok: true });
});

// PUT /outsourcing/settings
router.put('/settings', (req, res) => {
  const { key, value } = req.body;
  db.prepare(`
    INSERT INTO outsourcing_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(key, value);
  res.json({ ok: true });
});

module.exports = router;
