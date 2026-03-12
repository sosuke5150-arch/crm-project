import { useEffect, useState } from 'react';

const API = 'http://localhost:3001';

const STATUS_LABELS = {
  proposing: '提案中',
  planned: '提案予定',
  won: '受注',
  developing: '開発中',
  shikakake: '仕掛計上',
  monthly: '月額',
  done: '完了',
  forecast: '見込',
  open: 'オープン',
};

const STATUS_COLORS = {
  proposing: '#fbbf24',
  planned: '#fbbf24',
  won: '#34d399',
  developing: '#00d4ff',
  shikakake: '#a78bfa',
  monthly: '#34d399',
  done: '#4a5f82',
  forecast: '#fb923c',
  open: '#fbbf24',
};

export default function ProjectList({ onSelect }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/projects`)
      .then(r => r.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fmt = (n) => `¥${Math.round(Number(n || 0)).toLocaleString()}`;
  const fmtNum = (n) => Number(n || 0).toLocaleString();

  if (loading) return <div style={{ color: '#6b7fa3', padding: '40px' }}>読み込み中...</div>;

  return (
    <div>
      <h2>プロジェクト管理</h2>

      <div style={{ marginBottom: '12px', fontSize: '13px', color: '#6b7fa3' }}>
        受注額 50万円以上の受託開発案件をプロジェクトとして原価管理します。全 {projects.length} 件
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>プロジェクト名</th>
              <th>顧客</th>
              <th style={{ textAlign: 'right' }}>受注額</th>
              <th>ステータス</th>
              <th>検収月</th>
              <th style={{ textAlign: 'right' }}>コスト合計</th>
              <th style={{ textAlign: 'right' }}>利益</th>
              <th style={{ textAlign: 'right' }}>消化率</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#4a5f82', padding: '32px' }}>
                  50万円以上の案件がありません
                </td>
              </tr>
            )}
            {projects.map(p => {
              const progress = p.progress || 0;
              const profit = p.profit || 0;
              const profitColor = profit >= 0 ? '#34d399' : '#ff4d6a';
              const progressColor = progress > 100 ? '#ff4d6a' : progress > 80 ? '#fbbf24' : '#00d4ff';

              return (
                <tr
                  key={p.deal_id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelect(p.deal_id)}
                >
                  <td>
                    <span className="link">{p.title}</span>
                  </td>
                  <td>{p.customer_name}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-heading)', fontWeight: 600 }}>
                    {fmt(p.amount)}
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        background: `${STATUS_COLORS[p.status] || '#6b7fa3'}1a`,
                        color: STATUS_COLORS[p.status] || '#6b7fa3',
                        border: `1px solid ${STATUS_COLORS[p.status] || '#6b7fa3'}33`,
                      }}
                    >
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                  <td>{p.inspection_date || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(p.actual_total)}</td>
                  <td style={{ textAlign: 'right', color: profitColor, fontWeight: 600 }}>
                    {profit >= 0 ? '' : '-'}¥{Math.round(Math.abs(profit)).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ color: progressColor, fontWeight: 600 }}>
                      {progress.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
