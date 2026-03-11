const Database = require('better-sqlite3');
const db = new Database('./crm.sqlite');

// 顧客データを直接挿入（IDを明示指定）
const insertCustomer = db.prepare(
  'INSERT OR IGNORE INTO customers (id, name, company, sort_order) VALUES (?, ?, ?, ?)'
);

const customers = [
  [1,  '顧客1',              '顧客1（要修正）',                              1],
  [2,  '顧客2',              '顧客2（要修正）',                              2],
  [3,  '顧客3',              '顧客3（要修正）',                              3],
  [4,  '顧客4',              '顧客4（要修正）',                              4],
  [5,  '顧客5',              '顧客5（要修正）',                              5],
  [6,  '顧客6',              '顧客6（要修正）',                              6],
  [7,  '顧客7',              '顧客7（要修正）',                              7],
  [8,  '顧客8',              '顧客8（要修正）',                              8],
  [9,  '顧客9',              '顧客9（要修正）',                              9],
  [10, '顧客10',             '顧客10（要修正）',                            10],
  [11, '顧客11',             '顧客11（要修正）',                            11],
  [12, '顧客12',             '顧客12（要修正）',                            12],
  [13, '顧客13',             '顧客13（要修正）',                            13],
  [14, '顧客14',             '顧客14（要修正）',                            14],
  [15, 'JP指保サービス株式会社',        'JP指保サービス株式会社',        15],
  [16, 'スカラコミュニケーションズ株式会社', 'スカラコミュニケーションズ株式会社', 16],
  [17, '朝日写真株式会社',           '朝日写真株式会社',                17],
  [18, 'NSKK',               'NSKK',                                        18],
  [19, '株式会社ビジネスエンジニアリング', '株式会社ビジネスエンジニアリング', 19],
];

const insertTx = db.transaction(() => {
  for (const c of customers) {
    insertCustomer.run(...c);
  }
});
insertTx();
console.log('顧客登録完了');

// 案件データを直接挿入
const insertDeal = db.prepare(
  'INSERT INTO deals (customer_id, title, amount, status, inspection_date, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
);

const deals = [
  // 9月
  [5,  'マイコンパス月次保守開発',                          3080000, 'monthly',  '9月検収'],
  [3,  'B2-Online 定期開発',                                2500000, 'monthly',  '9月検収'],
  [6,  '高速ファイル伝送システム保守',                      75000,   'done',     '9月検収'],
  [15, 'Webフォーム修正並びにhokan連携対応',                420000,  'done',     '9月検収'],
  [16, '【Works】承認完了後に申請を差し戻す機能開発',       500000,  'done',     '9月検収'],
  // 10月
  [5,  'マイコンパス月次保守開発',                          3080000, 'monthly',  '10月検収'],
  [3,  'B2-Online 定期開発',                                2500000, 'monthly',  '10月検収'],
  [6,  '高速ファイル伝送システム保守',                      75000,   'done',     '10月検収'],
  // 11月
  [5,  'マイコンパス月次保守開発',                          3080000, 'monthly',  '11月検収'],
  [3,  'B2-Online 定期開発',                                2500000, 'monthly',  '11月検収'],
  [6,  '高速ファイル伝送システム保守',                      75000,   'done',     '11月検収'],
  [8,  '支店長TOP「見込みAB客進捗」関連改修',               360000,  'done',     '11月検収'],
  // 12月
  [5,  'マイコンパス月次保守開発',                          3080000, 'monthly',  '12月検収'],
  [3,  'B2-Online 定期開発',                                2500000, 'monthly',  '12月検収'],
  [6,  '高速ファイル伝送システム保守',                      75000,   'done',     '12月検収'],
  [4,  '会員ユーザー向け駐車場機器ヘルプサイト構築',        1860000, 'done',     '12月検収'],
  [17, 'データベースバージョンアップ業務',                  250000,  'done',     '12月検収'],
  [18, 'データベースバージョンアップ業務',                  150000,  'done',     '12月検収'],
  [19, 'データベースバージョンアップ業務',                  60000,   'done',     '12月検収'],
  [14, 'アプリ閉鎖作業',                                    250000,  'done',     '12月検収'],
];

const dealTx = db.transaction(() => {
  deals.forEach((d, i) => insertDeal.run(d[0], d[1], d[2], d[3], d[4], i + 1));
});
dealTx();
console.log('案件登録完了:', deals.length, '件');

// sqlite_sequence リセット（AUTOINCREMENT用）
db.prepare("UPDATE sqlite_sequence SET seq = 19 WHERE name = 'customers'").run();
db.prepare("UPDATE sqlite_sequence SET seq = ? WHERE name = 'deals'").run(deals.length);

console.log('完了！');
db.close();
