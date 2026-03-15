const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/customers', require('./routes/customers'));
app.use('/deals', require('./routes/deals'));
app.use('/targets', require('./routes/targets'));
app.use('/projects', require('./routes/projects'));
app.use('/export-ppt', require('./routes/exportPPT'));
app.use('/export-html', require('./routes/exportHTML'));

// ダッシュボード用サマリー
app.get('/summary', (req, res) => {
  const db = require('./db');
  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  const dealCount = db.prepare('SELECT COUNT(*) as count FROM deals').get().count;
  const doneCount = db.prepare("SELECT COUNT(*) as count FROM deals WHERE status IN ('done','monthly')").get().count;
  const developingCount = db.prepare("SELECT COUNT(*) as count FROM deals WHERE status = 'developing'").get().count;
  const proposingCount = db.prepare("SELECT COUNT(*) as count FROM deals WHERE status IN ('proposing','planned')").get().count;
  const forecastCount = db.prepare("SELECT COUNT(*) as count FROM deals WHERE status IN ('forecast','developing')").get().count;
  const totalAmount = db.prepare("SELECT SUM(amount) as total FROM deals WHERE status IN ('won','done','monthly','shikakake')").get().total || 0;
  const totalForecast = db.prepare("SELECT SUM(amount) as total FROM deals WHERE status IN ('forecast','developing')").get().total || 0;
  const totalTarget = db.prepare("SELECT SUM(amount) as total FROM targets").get().total || 0;
  res.json({ customerCount, dealCount, doneCount, developingCount, proposingCount, forecastCount, totalAmount, totalForecast, totalTarget });
});

// 検収月別売上集計（実績・見込み別）
app.get('/summary/by-month', (req, res) => {
  const db = require('./db');
  const rows = db.prepare(`
    SELECT
      inspection_date as month,
      SUM(CASE WHEN status IN ('won','done','monthly','shikakake') THEN amount ELSE 0 END) as actual,
      SUM(CASE WHEN status IN ('forecast','developing') THEN amount ELSE 0 END) as forecast
    FROM deals
    WHERE inspection_date IS NOT NULL AND inspection_date != ''
    GROUP BY inspection_date
  `).all();
  res.json(rows);
});

// 月別予実集計
app.get('/summary/yojitsu', (req, res) => {
  const db = require('./db');
  const actuals = db.prepare(`
    SELECT inspection_date as month, SUM(amount) as total
    FROM deals
    WHERE status IN ('won','done','monthly','shikakake')
      AND inspection_date IS NOT NULL AND inspection_date != ''
    GROUP BY inspection_date
  `).all();
  const forecasts = db.prepare(`
    SELECT inspection_date as month, SUM(amount) as total
    FROM deals
    WHERE status IN ('forecast','developing')
      AND inspection_date IS NOT NULL AND inspection_date != ''
    GROUP BY inspection_date
  `).all();
  const targets = db.prepare(`
    SELECT month, SUM(amount) as total
    FROM targets
    GROUP BY month
  `).all();
  res.json({ actuals, forecasts, targets });
});

// 顧客別売上集計
app.get('/summary/by-customer', (req, res) => {
  const db = require('./db');
  const rows = db.prepare(`
    SELECT c.company as customer, SUM(d.amount) as total
    FROM deals d
    JOIN customers c ON d.customer_id = c.id
    WHERE d.status IN ('won','done','monthly','shikakake')
    GROUP BY d.customer_id
    ORDER BY total DESC
  `).all();
  res.json(rows);
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
