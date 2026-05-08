const express = require('express');
const router = express.Router();
const db = require('../db');

// プロジェクト一覧（50万円以上のdeal）
router.get('/', (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT
        d.id as deal_id,
        d.title,
        d.amount,
        d.status,
        d.inspection_date,
        c.company as customer_name,
        pm.indirect_rate
      FROM deals d
      JOIN customers c ON d.customer_id = c.id
      LEFT JOIN project_meta pm ON pm.deal_id = d.id
      WHERE (
        (d.amount >= 500000
          AND d.title NOT LIKE 'マイコンパス月次保守開発%'
          AND d.title NOT LIKE 'B2-Online%定期開発%'
          AND d.status NOT IN ('proposing', 'planned', 'forecast'))
        OR d.is_project = 1
      )
      ORDER BY d.sort_order ASC, d.id ASC
    `).all();

    // 各プロジェクトの実績集計を追加
    const result = projects.map(p => {
      const laborTotal = db.prepare(`
        SELECT COALESCE(SUM(hours * unit_price), 0) as total FROM direct_costs WHERE deal_id = ?
      `).get(p.deal_id).total;

      const outsourcingTotal = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM outsourcing_costs WHERE deal_id = ?
      `).get(p.deal_id).total;

      const expensesTotal = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM project_expenses WHERE deal_id = ?
      `).get(p.deal_id).total;

      const indirectRows = db.prepare(`SELECT ic.unit_price, COALESCE(dc.hours,0) as hours FROM indirect_costs ic LEFT JOIN (SELECT deal_id, month, SUM(hours) as hours FROM direct_costs GROUP BY deal_id, month) dc ON ic.deal_id=dc.deal_id AND ic.month=dc.month WHERE ic.deal_id=?`).all(p.deal_id);
      const indirectTotal = indirectRows.reduce((s, r) => s + r.unit_price * r.hours, 0);
      const actualTotal = laborTotal + outsourcingTotal + expensesTotal + indirectTotal;
      const profit = p.amount - actualTotal;
      const progress = p.amount > 0 ? (actualTotal / p.amount * 100) : 0;

      return {
        ...p,
        labor_total: laborTotal,
        outsourcing_total: outsourcingTotal,
        expenses_total: expensesTotal,
        indirect_total: indirectTotal,
        actual_total: actualTotal,
        profit,
        progress,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// プロジェクト詳細
router.get('/:dealId', (req, res) => {
  try {
    const { dealId } = req.params;
    const deal = db.prepare(`
      SELECT d.*, c.company as customer_name
      FROM deals d
      JOIN customers c ON d.customer_id = c.id
      WHERE d.id = ?
    `).get(dealId);

    if (!deal) return res.status(404).json({ error: '案件が見つかりません' });

    const meta = db.prepare('SELECT * FROM project_meta WHERE deal_id = ?').get(dealId) || {
      deal_id: Number(dealId),
      estimated_hours: 0,
      estimated_labor: 0,
      estimated_outsourcing: 0,
      estimated_expenses: 0,
      estimated_indirect: 0,
      indirect_rate: 6.5,
      notes: '',
      project_code: '',
      order_date: '',
      acceptance_date: '',
    };

    const laborTotal = db.prepare(`
      SELECT COALESCE(SUM(hours * unit_price), 0) as total FROM direct_costs WHERE deal_id = ?
    `).get(dealId).total;

    const outsourcingTotal = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM outsourcing_costs WHERE deal_id = ?
    `).get(dealId).total;

    const expensesTotal = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM project_expenses WHERE deal_id = ?
    `).get(dealId).total;

    const indirectTotal = db.prepare(`SELECT COALESCE(SUM(unit_price * hours), 0) as total FROM indirect_costs WHERE deal_id = ?`).get(dealId).total;
    const actualTotal = laborTotal + outsourcingTotal + expensesTotal + indirectTotal;
    const profit = deal.amount - actualTotal;
    const progress = deal.amount > 0 ? (actualTotal / deal.amount * 100) : 0;

    res.json({
      deal,
      meta,
      summary: {
        labor_total: laborTotal,
        outsourcing_total: outsourcingTotal,
        expenses_total: expensesTotal,
        indirect_total: indirectTotal,
        actual_total: actualTotal,
        profit,
        progress,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// project_meta upsert
router.put('/:dealId/meta', (req, res) => {
  try {
    const { dealId } = req.params;
    const { estimated_hours, estimated_labor, estimated_outsourcing, estimated_expenses, estimated_indirect, notes, project_code, order_date, acceptance_date } = req.body;

    const existing = db.prepare('SELECT id FROM project_meta WHERE deal_id = ?').get(dealId);
    if (existing) {
      db.prepare(`
        UPDATE project_meta SET
          estimated_hours = ?,
          estimated_labor = ?,
          estimated_outsourcing = ?,
          estimated_expenses = ?,
          estimated_indirect = ?,
          notes = ?,
          project_code = ?,
          order_date = ?,
          acceptance_date = ?
        WHERE deal_id = ?
      `).run(
        estimated_hours ?? 0,
        estimated_labor ?? 0,
        estimated_outsourcing ?? 0,
        estimated_expenses ?? 0,
        estimated_indirect ?? 0,
        notes ?? '',
        project_code ?? '',
        order_date ?? '',
        acceptance_date ?? '',
        dealId
      );
    } else {
      db.prepare(`
        INSERT INTO project_meta (deal_id, estimated_hours, estimated_labor, estimated_outsourcing, estimated_expenses, estimated_indirect, notes, project_code, order_date, acceptance_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        dealId,
        estimated_hours ?? 0,
        estimated_labor ?? 0,
        estimated_outsourcing ?? 0,
        estimated_expenses ?? 0,
        estimated_indirect ?? 0,
        notes ?? '',
        project_code ?? '',
        order_date ?? '',
        acceptance_date ?? ''
      );
    }

    const updated = db.prepare('SELECT * FROM project_meta WHERE deal_id = ?').get(dealId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 直接費 ---
router.get('/:dealId/direct-costs', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM direct_costs WHERE deal_id = ? ORDER BY month ASC, id ASC').all(req.params.dealId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:dealId/direct-costs', (req, res) => {
  try {
    const { dealId } = req.params;
    const { month, member, hours, unit_price } = req.body;
    const result = db.prepare(
      'INSERT INTO direct_costs (deal_id, month, member, hours, unit_price) VALUES (?, ?, ?, ?, ?)'
    ).run(dealId, month || '', member || '', hours || 0, unit_price || 0);
    const row = db.prepare('SELECT * FROM direct_costs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/direct-costs/:id', (req, res) => {
  try {
    const { month, member, hours, unit_price } = req.body;
    const current = db.prepare('SELECT * FROM direct_costs WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: '見つかりません' });
    db.prepare('UPDATE direct_costs SET month=?, member=?, hours=?, unit_price=? WHERE id=?').run(
      month ?? current.month,
      member ?? current.member,
      hours ?? current.hours,
      unit_price ?? current.unit_price,
      req.params.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/direct-costs/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM direct_costs WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: '見つかりません' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 外注費 ---
router.get('/:dealId/outsourcing', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM outsourcing_costs WHERE deal_id = ? ORDER BY date ASC, id ASC').all(req.params.dealId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:dealId/outsourcing', (req, res) => {
  try {
    const { dealId } = req.params;
    const { date, vendor, description, amount, notes } = req.body;
    const result = db.prepare(
      'INSERT INTO outsourcing_costs (deal_id, date, vendor, description, amount, notes) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(dealId, date || '', vendor || '', description || '', amount || 0, notes || '');
    const row = db.prepare('SELECT * FROM outsourcing_costs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/outsourcing/:id', (req, res) => {
  try {
    const { date, vendor, description, amount, notes } = req.body;
    const current = db.prepare('SELECT * FROM outsourcing_costs WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: '見つかりません' });
    db.prepare('UPDATE outsourcing_costs SET date=?, vendor=?, description=?, amount=?, notes=? WHERE id=?').run(
      date ?? current.date,
      vendor ?? current.vendor,
      description ?? current.description,
      amount ?? current.amount,
      notes ?? current.notes,
      req.params.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/outsourcing/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM outsourcing_costs WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: '見つかりません' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 経費 ---
router.get('/:dealId/expenses', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM project_expenses WHERE deal_id = ? ORDER BY date ASC, id ASC').all(req.params.dealId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:dealId/expenses', (req, res) => {
  try {
    const { dealId } = req.params;
    const { date, user_name, item, purpose, amount } = req.body;
    const result = db.prepare(
      'INSERT INTO project_expenses (deal_id, date, user_name, item, purpose, amount) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(dealId, date || '', user_name || '', item || '', purpose || '', amount || 0);
    const row = db.prepare('SELECT * FROM project_expenses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/expenses/:id', (req, res) => {
  try {
    const { date, user_name, item, purpose, amount } = req.body;
    const current = db.prepare('SELECT * FROM project_expenses WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: '見つかりません' });
    db.prepare('UPDATE project_expenses SET date=?, user_name=?, item=?, purpose=?, amount=? WHERE id=?').run(
      date ?? current.date,
      user_name ?? current.user_name,
      item ?? current.item,
      purpose ?? current.purpose,
      amount ?? current.amount,
      req.params.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/expenses/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM project_expenses WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: '見つかりません' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 間接費 ---
router.get('/:dealId/indirect-costs', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM indirect_costs WHERE deal_id = ? ORDER BY month ASC, id ASC').all(req.params.dealId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:dealId/indirect-costs', (req, res) => {
  try {
    const { dealId } = req.params;
    const { month, unit_price, hours } = req.body;
    const result = db.prepare(
      'INSERT INTO indirect_costs (deal_id, month, unit_price, hours) VALUES (?, ?, ?, ?)'
    ).run(dealId, month || '', unit_price || 0, hours || 0);
    const row = db.prepare('SELECT * FROM indirect_costs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/indirect-costs/:id', (req, res) => {
  try {
    const { month, unit_price, hours } = req.body;
    const current = db.prepare('SELECT * FROM indirect_costs WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: '見つかりません' });
    db.prepare('UPDATE indirect_costs SET month=?, unit_price=?, hours=? WHERE id=?').run(
      month ?? current.month,
      unit_price ?? current.unit_price,
      hours ?? current.hours,
      req.params.id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/indirect-costs/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM indirect_costs WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: '見つかりません' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
