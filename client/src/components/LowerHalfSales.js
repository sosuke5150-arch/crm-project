import { useEffect, useState } from 'react';

const API = 'http://localhost:3001';

const LOWER_MONTHS = ['3月', '4月', '5月', '6月', '7月', '8月'];
const ACTUAL_STATUSES = new Set(['won', 'done', 'monthly', 'shikakake']);
const FORECAST_STATUSES = new Set(['forecast', 'developing']);

const monthOrder = (dateStr) => {
  if (!dateStr) return 99;
  for (let i = 0; i < LOWER_MONTHS.length; i++) {
    if (dateStr.includes(LOWER_MONTHS[i])) return i;
  }
  return 99;
};

const commas = v => (Number(v) || 0).toLocaleString();

export default function LowerHalfSales() {
  const [deals, setDeals] = useState([]);
  const [targets, setTargets] = useState({});

  useEffect(() => {
    fetch(`${API}/deals`).then(r => r.json()).then(setDeals);
    fetch(`${API}/targets`).then(r => r.json()).then(rows => {
      const map = {};
      rows.forEach(r => { map[`${r.customer_id}_${r.month}`] = r.amount; });
      setTargets(map);
    });
  }, []);

  const lowerDeals = deals
    .filter(d => {
      if (!ACTUAL_STATUSES.has(d.status) && !FORECAST_STATUSES.has(d.status)) return false;
      if (!d.inspection_date) return false;
      return LOWER_MONTHS.some(m => d.inspection_date.includes(m));
    })
    .sort((a, b) => {
      const mo = monthOrder(a.inspection_date) - monthOrder(b.inspection_date);
      if (mo !== 0) return mo;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

  const totalSales = lowerDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const totalBudget = Object.entries(targets)
    .filter(([key]) => LOWER_MONTHS.some(m => key.endsWith(`_${m}`)))
    .reduce((sum, [, v]) => sum + (Number(v) || 0), 0);

  const diff = totalSales - totalBudget;
  const light = ['excel', 'earth'].includes(document.body.dataset.theme || 'dark');

  const border = '1px solid var(--border)';
  const thStyle = (extra = {}) => ({
    padding: '8px 12px', border, color: 'var(--text-mid)',
    fontSize: '12px', background: 'var(--bg-panel)',
    whiteSpace: 'nowrap', ...extra,
  });
  const footerCell = (extra = {}) => ({
    padding: '10px 12px', border, background: 'var(--bg-panel)', ...extra,
  });

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ color: 'var(--text-heading)', marginBottom: '16px', fontSize: '16px' }}>
        下期　売上一覧（実績＋見込）
      </h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '13px', background: 'var(--bg-inner)', minWidth: '700px' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle(), textAlign: 'left', minWidth: '130px' }}>顧客</th>
              <th style={{ ...thStyle(), textAlign: 'left', minWidth: '300px' }}>プロジェクト</th>
              <th style={{ ...thStyle(), textAlign: 'right', minWidth: '120px' }}>金額</th>
              <th style={{ ...thStyle(), textAlign: 'center', minWidth: '80px' }}>検収</th>
              <th style={{ ...thStyle(), textAlign: 'center', width: '110px' }}></th>
            </tr>
          </thead>
          <tbody>
            {lowerDeals.map((deal, i) => {
              const isShikakake = deal.status === 'shikakake';
              const isForecast = FORECAST_STATUSES.has(deal.status);
              const isNew = deal.topics && deal.topics.toUpperCase().includes('NEW');
              const bg = isForecast
                ? 'rgba(251,146,60,0.05)'
                : i % 2 === 0 ? 'var(--bg-inner)' : 'var(--bg-input)';
              return (
                <tr key={deal.id} style={{ background: bg }}>
                  <td style={{ padding: '7px 12px', border, color: 'var(--customer-color)', fontWeight: 500 }}>
                    {deal.customer_name}
                  </td>
                  <td style={{ padding: '7px 12px', border, color: isForecast ? (light ? '#c2410c' : '#ff4d6a') : 'var(--text-body)' }}>
                    {deal.title}
                  </td>
                  <td style={{ padding: '7px 12px', border, color: isForecast ? (light ? '#c2410c' : '#ff4d6a') : 'var(--text-body)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {commas(deal.amount)}
                  </td>
                  <td style={{ padding: '7px 12px', border, color: isForecast ? (light ? '#c2410c' : '#ff4d6a') : 'var(--text-muted)', textAlign: 'center' }}>
                    {deal.inspection_date}
                  </td>
                  <td style={{ padding: '7px 12px', border, textAlign: 'center' }}>
                    {isShikakake && (
                      <span style={{ color: light ? '#c2410c' : '#fb923c', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        仕掛かり計上
                      </span>
                    )}
                    {isForecast && (
                      <span style={{ color: light ? '#c2410c' : '#fb923c', fontSize: '11px', fontWeight: 600 }}>
                        見込
                      </span>
                    )}
                    {isNew && (
                      <span style={{ color: light ? '#16803a' : '#34d399', fontSize: '11px', fontWeight: 700 }}>
                        NEW
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ ...footerCell(), textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>
                下期売上合計（実績＋見込）
              </td>
              <td style={{ ...footerCell(), textAlign: 'right', color: 'var(--text-body)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {commas(totalSales)}
              </td>
              <td colSpan={2} style={{ ...footerCell() }} />
            </tr>
            <tr>
              <td colSpan={2} style={{ ...footerCell(), textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>
                下期予算
              </td>
              <td style={{ ...footerCell(), textAlign: 'right', color: 'var(--text-body)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {commas(totalBudget)}
              </td>
              <td colSpan={2} style={{ ...footerCell() }} />
            </tr>
            <tr>
              <td colSpan={2} style={{ ...footerCell(), textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>
                差異
              </td>
              <td style={{
                ...footerCell(),
                textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                background: diff > 0 ? (light ? 'rgba(22,128,58,0.1)' : 'rgba(250,204,21,0.12)') : diff < 0 ? 'rgba(255,77,106,0.12)' : 'var(--bg-panel)',
                color: diff > 0 ? (light ? '#16803a' : '#facc15') : diff < 0 ? (light ? '#dc2626' : '#ff4d6a') : 'var(--text-muted)',
              }}>
                {commas(diff)}
              </td>
              <td colSpan={2} style={{ ...footerCell() }} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
