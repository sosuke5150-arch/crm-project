import { useEffect, useState, useRef } from 'react';

const API = 'http://localhost:3001';

const INSPECTION_OPTIONS = ['9月検収','10月検収','11月検収','12月検収','1月検収','2月検収','3月検収','4月検収','5月検収','6月検収','7月検収','8月検収'];
const EMPTY_FORM = { customer_id: '', title: '', status: 'won', amount: '', inspection_date: '', topics: '' };

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

function isLightTheme() {
  return ['excel', 'earth'].includes(document.body.dataset.theme || 'dark');
}

const STATUS_COLORS_DARK = {
  proposing: '#fbbf24', planned: '#fbbf24', won: '#34d399',
  developing: '#00d4ff', shikakake: '#a78bfa', monthly: '#34d399',
  done: '#4a5f82', forecast: '#fb923c',
};
const STATUS_COLORS_LIGHT = {
  proposing: '#b45309', planned: '#b45309', won: '#16803a',
  developing: '#1d6395', shikakake: '#7e22ce', monthly: '#16803a',
  done: '#4b5563', forecast: '#c2410c',
};
function getStatusColors() {
  return isLightTheme() ? STATUS_COLORS_LIGHT : STATUS_COLORS_DARK;
}

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

const EMPTY_FILTER = { keyword: '', customer: '', status: '', inspection_date: '' };

export default function ProjectList({ onSelect }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const formRef = useRef(null);
  const dragIndex = useRef(null);

  const loadProjects = () => {
    setLoading(true);
    fetch(`${API}/projects`)
      .then(r => r.json())
      .then(data => { setProjects(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadProjects();
    fetch(`${API}/customers`).then(r => r.json()).then(setCustomers);
  }, []);

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showForm]);

  const handleDragStart = (dealId) => {
    dragIndex.current = dealId;
  };

  const handleDrop = async (dropDealId) => {
    if (dragIndex.current === null || dragIndex.current === dropDealId) return;
    const fromId = dragIndex.current;
    dragIndex.current = null;
    const updated = [...projects];
    const fromIdx = updated.findIndex(p => p.deal_id === fromId);
    const toIdx = updated.findIndex(p => p.deal_id === dropDealId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setProjects(updated);
    await fetch(`${API}/deals/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: updated.map(p => p.deal_id) }),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await fetch(`${API}/deals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, is_project: 1 }),
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSubmitting(false);
    loadProjects();
  };

  const fmt = (n) => `¥${Math.round(Number(n || 0)).toLocaleString()}`;
  const fmtNum = (n) => Number(n || 0).toLocaleString();

  const filteredProjects = projects.filter(p => {
    if (filter.keyword && !p.title.includes(filter.keyword)) return false;
    if (filter.customer && p.customer_name !== filter.customer) return false;
    if (filter.status && p.status !== filter.status) return false;
    if (filter.inspection_date && p.inspection_date !== filter.inspection_date) return false;
    return true;
  });

  const uniqueCustomers = [...new Set(projects.map(p => p.customer_name).filter(Boolean))];
  const isFiltered = Object.values(filter).some(v => v !== '');

  if (loading) return <div style={{ color: '#6b7fa3', padding: '40px' }}>読み込み中...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h2 style={{ margin: 0 }}>プロジェクト原価管理</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ padding: '7px 16px', background: showForm ? 'transparent' : 'var(--accent)', border: '1px solid var(--accent)', borderRadius: '6px', color: showForm ? 'var(--accent)' : 'var(--bg-inner)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {showForm ? 'キャンセル' : '＋ 新規案件登録'}
        </button>
      </div>

      <div style={{ marginBottom: '12px', fontSize: '13px', color: '#6b7fa3' }}>
        受注額 50万円以上の受託開発案件をプロジェクトとして原価管理します。
        {isFiltered ? ` ${filteredProjects.length} 件 / 全 ${projects.length} 件` : ` 全 ${projects.length} 件`}
      </div>

      {/* 絞り込み検索 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
        <input
          placeholder="プロジェクト名で検索"
          value={filter.keyword}
          onChange={e => setFilter({ ...filter, keyword: e.target.value })}
          style={{ minWidth: '200px', fontSize: '13px' }}
        />
        <select
          value={filter.customer}
          onChange={e => setFilter({ ...filter, customer: e.target.value })}
          style={{ fontSize: '13px' }}
        >
          <option value="">顧客 すべて</option>
          {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filter.status}
          onChange={e => setFilter({ ...filter, status: e.target.value })}
          style={{ fontSize: '13px' }}
        >
          <option value="">ステータス すべて</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select
          value={filter.inspection_date}
          onChange={e => setFilter({ ...filter, inspection_date: e.target.value })}
          style={{ fontSize: '13px' }}
        >
          <option value="">検収月 すべて</option>
          {INSPECTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {isFiltered && (
          <button
            onClick={() => setFilter(EMPTY_FILTER)}
            style={{ padding: '5px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-faint)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            クリア
          </button>
        )}
      </div>

      {/* 新規登録フォーム */}
      {showForm && (
        <div ref={formRef} className="card" style={{ marginBottom: '16px', padding: '16px' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', color: 'var(--text-heading)' }}>新規案件登録</div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-end' }}>
            <select value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} required>
              <option value="">顧客を選択 *</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
            <input placeholder="案件名 *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required style={{ minWidth: '200px' }} />
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input type="number" placeholder="金額（円）*" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required style={{ width: '140px' }} />
            <select value={form.inspection_date} onChange={e => setForm({...form, inspection_date: e.target.value})}>
              <option value="">検収月</option>
              {INSPECTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <input placeholder="トピックス" value={form.topics} onChange={e => setForm({...form, topics: e.target.value})} style={{ minWidth: '160px' }} />
            <button type="submit" disabled={submitting} style={{ padding: '7px 18px', background: 'var(--accent)', color: 'var(--bg-inner)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? '登録中...' : '登録'}
            </button>
          </form>
          <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '8px' }}>※ 金額が50万円以上の案件がプロジェクトとして表示されます</div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '24px' }}></th>
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
            {filteredProjects.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: '#4a5f82', padding: '32px' }}>
                  {isFiltered ? '条件に一致するプロジェクトがありません' : '50万円以上の案件がありません'}
                </td>
              </tr>
            )}
            {filteredProjects.map((p, index) => {
              const progress = p.progress || 0;
              const profit = p.profit || 0;
              const light = isLightTheme();
              const SC = getStatusColors();
              const profitColor = profit >= 0 ? (light ? '#16803a' : '#34d399') : (light ? '#dc2626' : '#ff4d6a');
              const progressColor = progress > 100 ? (light ? '#dc2626' : '#ff4d6a') : progress > 80 ? (light ? '#b45309' : '#fbbf24') : (light ? '#1d6395' : '#00d4ff');

              return (
                <tr
                  key={p.deal_id}
                  draggable
                  onDragStart={() => handleDragStart(p.deal_id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(p.deal_id)}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelect(p.deal_id)}
                >
                  <td style={{ color: 'var(--text-faint)', fontSize: '16px', cursor: 'grab', textAlign: 'center' }}
                    onClick={e => e.stopPropagation()}>⠿</td>
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
                        background: `${SC[p.status] || '#6b7fa3'}1a`,
                        color: SC[p.status] || '#6b7fa3',
                        border: `1px solid ${SC[p.status] || '#6b7fa3'}33`,
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
