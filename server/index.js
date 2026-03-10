const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/customers', require('./routes/customers'));
app.use('/deals', require('./routes/deals'));
app.use('/targets', require('./routes/targets'));

// ダッシュボード用サマリー
app.get('/summary', (req, res) => {
  const db = require('./db');
  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  const dealCount = db.prepare('SELECT COUNT(*) as count FROM deals').get().count;
  const totalAmount = db.prepare("SELECT SUM(amount) as total FROM deals WHERE status = 'won'").get().total || 0;
  const openDeals = db.prepare("SELECT COUNT(*) as count FROM deals WHERE status = 'open'").get().count;
  res.json({ customerCount, dealCount, totalAmount, openDeals });
});

// 検収月別売上集計
app.get('/summary/by-month', (req, res) => {
  const db = require('./db');
  const rows = db.prepare(`
    SELECT inspection_date as month, SUM(amount) as total
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
    WHERE status IN ('won','done','monthly','developing')
      AND inspection_date IS NOT NULL AND inspection_date != ''
    GROUP BY inspection_date
  `).all();
  const targets = db.prepare(`
    SELECT month, SUM(amount) as total
    FROM targets
    GROUP BY month
  `).all();
  res.json({ actuals, targets });
});

// 顧客別売上集計
app.get('/summary/by-customer', (req, res) => {
  const db = require('./db');
  const rows = db.prepare(`
    SELECT c.company as customer, SUM(d.amount) as total
    FROM deals d
    JOIN customers c ON d.customer_id = c.id
    WHERE d.status IN ('won','done','monthly','developing')
    GROUP BY d.customer_id
    ORDER BY total DESC
  `).all();
  res.json(rows);
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
