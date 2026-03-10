const http = require('http');

const post = (data) => new Promise((resolve) => {
  const body = JSON.stringify(data);
  const req = http.request({
    hostname: 'localhost', port: 3001, path: '/deals', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, res => { res.resume(); res.on('end', resolve); });
  req.write(body); req.end();
});

const postCustomer = (data) => new Promise((resolve) => {
  const body = JSON.stringify(data);
  const req = http.request({
    hostname: 'localhost', port: 3001, path: '/customers', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => resolve(JSON.parse(d)));
  });
  req.write(body); req.end();
});

async function main() {
  // 顧客登録（既存IDを使用 or 新規作成）
  const cust = await postCustomer({ company: 'JP指保サービス株式会社' });
  const jpId = cust.id;
  const scala = await postCustomer({ company: 'スカラコミュニケーションズ株式会社' });
  const scalaId = scala.id;
  const asahi = await postCustomer({ company: '朝日写真株式会社' });
  const asahiId = asahi.id;
  const nskk = await postCustomer({ company: 'NSKK' });
  const nskkId = nskk.id;
  const biz = await postCustomer({ company: '株式会社ビジネスエンジニアリング' });
  const bizId = biz.id;

  console.log('顧客ID:', { jpId, scalaId, asahiId, nskkId, bizId });

  const deals = [
    // 9月
    { customer_id: 5,       title: 'マイコンパス月次保守開発',                    amount: 3080000, status: 'monthly', inspection_date: '9月検収' },
    { customer_id: 3,       title: 'B2-Online 定期開発',                          amount: 2500000, status: 'monthly', inspection_date: '9月検収' },
    { customer_id: 6,       title: '高速ファイル伝送システム保守',                 amount: 75000,   status: 'done',    inspection_date: '9月検収' },
    { customer_id: jpId,    title: 'Webフォーム修正並びにhokan連携対応',           amount: 420000,  status: 'done',    inspection_date: '9月検収' },
    { customer_id: scalaId, title: '【Works】承認完了後に申請を差し戻す機能開発', amount: 500000,  status: 'done',    inspection_date: '9月検収' },
    // 10月
    { customer_id: 5, title: 'マイコンパス月次保守開発',     amount: 3080000, status: 'monthly', inspection_date: '10月検収' },
    { customer_id: 3, title: 'B2-Online 定期開発',           amount: 2500000, status: 'monthly', inspection_date: '10月検収' },
    { customer_id: 6, title: '高速ファイル伝送システム保守', amount: 75000,   status: 'done',    inspection_date: '10月検収' },
    // 11月
    { customer_id: 5, title: 'マイコンパス月次保守開発',                amount: 3080000, status: 'monthly', inspection_date: '11月検収' },
    { customer_id: 3, title: 'B2-Online 定期開発',                      amount: 2500000, status: 'monthly', inspection_date: '11月検収' },
    { customer_id: 6, title: '高速ファイル伝送システム保守',             amount: 75000,   status: 'done',    inspection_date: '11月検収' },
    { customer_id: 8, title: '支店長TOP「見込みAB客進捗」関連改修',     amount: 360000,  status: 'done',    inspection_date: '11月検収' },
    // 12月
    { customer_id: 5,       title: 'マイコンパス月次保守開発',                 amount: 3080000, status: 'monthly', inspection_date: '12月検収' },
    { customer_id: 3,       title: 'B2-Online 定期開発',                       amount: 2500000, status: 'monthly', inspection_date: '12月検収' },
    { customer_id: 6,       title: '高速ファイル伝送システム保守',              amount: 75000,   status: 'done',    inspection_date: '12月検収' },
    { customer_id: 4,       title: '会員ユーザー向け駐車場機器ヘルプサイト構築', amount: 1860000, status: 'done',    inspection_date: '12月検収' },
    { customer_id: asahiId, title: 'データベースバージョンアップ業務',          amount: 250000,  status: 'done',    inspection_date: '12月検収' },
    { customer_id: nskkId,  title: 'データベースバージョンアップ業務',          amount: 150000,  status: 'done',    inspection_date: '12月検収' },
    { customer_id: bizId,   title: 'データベースバージョンアップ業務',          amount: 60000,   status: 'done',    inspection_date: '12月検収' },
    { customer_id: 14,      title: 'アプリ閉鎖作業',                            amount: 250000,  status: 'done',    inspection_date: '12月検収' },
  ];

  for (const d of deals) {
    await post(d);
    console.log('登録:', d.title, d.inspection_date);
  }
  console.log('完了');
}

main().catch(console.error);
