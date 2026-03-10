const Database = require('better-sqlite3');
const db = new Database('./crm.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );
`);

// 新カラムを追加（既存DBへの対応）
['postal_code', 'prefecture', 'address', 'building', 'url'].forEach(col => {
  try { db.exec(`ALTER TABLE customers ADD COLUMN ${col} TEXT`); } catch {}
});

try { db.exec(`ALTER TABLE customers ADD COLUMN sort_order INTEGER`); } catch {}
// sort_orderが未設定の行を初期化
db.exec(`UPDATE customers SET sort_order = id WHERE sort_order IS NULL`);

try { db.exec(`ALTER TABLE deals ADD COLUMN inspection_date TEXT`); } catch {}
try { db.exec(`ALTER TABLE deals ADD COLUMN topics TEXT`); } catch {}
try { db.exec(`ALTER TABLE deals ADD COLUMN sort_order INTEGER`); } catch {}
db.exec(`UPDATE deals SET sort_order = id WHERE sort_order IS NULL`);

db.exec(`
  CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    UNIQUE(customer_id, month)
  );
`);

module.exports = db;
