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
try { db.exec(`ALTER TABLE deals ADD COLUMN is_project INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE project_meta ADD COLUMN estimated_indirect INTEGER DEFAULT 0`); } catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    UNIQUE(customer_id, month)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS project_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id INTEGER UNIQUE,
    estimated_hours REAL DEFAULT 0,
    estimated_labor INTEGER DEFAULT 0,
    estimated_outsourcing INTEGER DEFAULT 0,
    estimated_expenses INTEGER DEFAULT 0,
    indirect_rate REAL DEFAULT 6.5,
    estimated_indirect INTEGER DEFAULT 0,
    notes TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS direct_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id INTEGER,
    month TEXT,
    member TEXT,
    hours REAL DEFAULT 0,
    unit_price INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS outsourcing_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id INTEGER,
    date TEXT,
    vendor TEXT,
    description TEXT,
    amount INTEGER DEFAULT 0,
    notes TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS project_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id INTEGER,
    date TEXT,
    user_name TEXT,
    item TEXT,
    purpose TEXT,
    amount INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS indirect_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deal_id INTEGER,
    month TEXT,
    unit_price INTEGER DEFAULT 0,
    hours REAL DEFAULT 0
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS topics_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT NOT NULL DEFAULT '既存顧客案件',
    customer TEXT DEFAULT '',
    project TEXT DEFAULT '',
    status TEXT DEFAULT '',
    amount TEXT DEFAULT '',
    inspection_date TEXT DEFAULT '',
    topics TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try { db.exec(`ALTER TABLE topics_items ADD COLUMN row_color TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE customer_scoring ADD COLUMN sort_order INTEGER`); } catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS customer_scoring (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT DEFAULT '',
    product_name TEXT DEFAULT '',
    assignee TEXT DEFAULT '',
    visitor TEXT DEFAULT '',
    last_visit_date TEXT DEFAULT '',
    claim_status TEXT DEFAULT '',
    ticket_status TEXT DEFAULT '',
    score INTEGER DEFAULT 3,
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
