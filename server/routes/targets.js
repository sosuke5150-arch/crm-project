const express = require('express');
const router = express.Router();
const db = require('../db');

// 全目標取得
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM targets').all();
  res.json(rows);
});

// 目標を登録・更新（upsert）
router.post('/', (req, res) => {
  const { customer_id, month, amount } = req.body;
  db.prepare(`
    INSERT INTO targets (customer_id, month, amount)
    VALUES (?, ?, ?)
    ON CONFLICT(customer_id, month) DO UPDATE SET amount = excluded.amount
  `).run(customer_id, month, amount || 0);
  res.json({ success: true });
});

module.exports = router;
