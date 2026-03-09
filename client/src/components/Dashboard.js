import { useEffect, useState } from 'react';

const API = 'http://localhost:3001';

export default function Dashboard() {
  const [summary, setSummary] = useState({ customerCount: 0, dealCount: 0, totalAmount: 0, openDeals: 0 });

  useEffect(() => {
    fetch(`${API}/summary`).then(r => r.json()).then(setSummary).catch(() => {});
  }, []);

  return (
    <div>
      <h2>ダッシュボード</h2>
      <div className="stats">
        <div className="stat">
          <div className="stat-label">顧客数</div>
          <div className="stat-value">{summary.customerCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">案件数</div>
          <div className="stat-value">{summary.dealCount}</div>
        </div>
        <div className="stat">
          <div className="stat-label">進行中の案件</div>
          <div className="stat-value">{summary.openDeals}</div>
        </div>
        <div className="stat">
          <div className="stat-label">受注合計（円）</div>
          <div className="stat-value">{summary.totalAmount.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
