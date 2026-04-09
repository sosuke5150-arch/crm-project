import { useEffect, useState } from 'react';

const API = 'http://localhost:3001';

const INSPECTION_OPTIONS = ['9月検収','10月検収','11月検収','12月検収','1月検収','2月検収','3月検収','4月検収','5月検収','6月検収','7月検収','8月検収'];

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

const inputStyle = {
  padding: '7px 12px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  fontSize: '13px',
  fontFamily: "'Inter', sans-serif",
  color: 'var(--text-body)',
  width: '100%',
};

const labelStyle = {
  fontSize: '12px',
  color: 'var(--text-faint)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
  display: 'block',
};

const sectionStyle = {
  marginBottom: '8px',
};

function SummaryRow({ label, value, highlight, large }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: large ? '10px 0' : '6px 0',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <span style={{ fontSize: large ? '14px' : '13px', color: highlight ? 'var(--text-heading)' : 'var(--text-mid)', fontWeight: large ? 600 : 400 }}>
        {label}
      </span>
      <span style={{ fontSize: large ? '15px' : '13px', color: highlight || 'var(--text-td)', fontWeight: large ? 700 : 500 }}>
        {value}
      </span>
    </div>
  );
}

export default function ProjectDetail({ dealId, onBack, onNavigate }) {
  const [data, setData] = useState(null);
  const [projectIds, setProjectIds] = useState([]);
  const [directCosts, setDirectCosts] = useState([]);
  const [outsourcing, setOutsourcing] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [ocOpen, setOcOpen] = useState(false);
  const [exOpen, setExOpen] = useState(false);
  const [icOpen, setIcOpen] = useState(false);

  // 見積フォーム
  const [metaForm, setMetaForm] = useState({
    estimated_hours: '',
    estimated_labor: '',
    estimated_outsourcing: '',
    estimated_expenses: '',
    estimated_indirect: '',
    notes: '',
    project_code: '',
    order_date: '',
    acceptance_date: '',
  });
  const [customers, setCustomers] = useState([]);
  const [dealForm, setDealForm] = useState({ customer_id: '', status: '', amount: '', inspection_date: '' });
  const [infoEditing, setInfoEditing] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);
  const [metaEditing, setMetaEditing] = useState(false);

  // 直接費追加フォーム
  const [dcForm, setDcForm] = useState({ month: '', member: '', hours: '', unit_price: '' });
  const [dcEditing, setDcEditing] = useState(null); // {id, month, member, hours, unit_price}

  // 外注費追加フォーム
  const [ocForm, setOcForm] = useState({ date: '', vendor: '', description: '', amount: '', notes: '' });
  const [ocEditing, setOcEditing] = useState(null);

  // 経費追加フォーム
  const [exForm, setExForm] = useState({ date: '', user_name: '', item: '', purpose: '', amount: '' });
  const [exEditing, setExEditing] = useState(null);

  // 間接費
  const [indirectCosts, setIndirectCosts] = useState([]);
  const [icForm, setIcForm] = useState({ month: '', unit_price: '', hours: '' });
  const [icEditing, setIcEditing] = useState(null);

  const load = async () => {
    try {
      const [detailRes, dcRes, ocRes, exRes, icRes] = await Promise.all([
        fetch(`${API}/projects/${dealId}`).then(r => r.json()),
        fetch(`${API}/projects/${dealId}/direct-costs`).then(r => r.json()),
        fetch(`${API}/projects/${dealId}/outsourcing`).then(r => r.json()),
        fetch(`${API}/projects/${dealId}/expenses`).then(r => r.json()),
        fetch(`${API}/projects/${dealId}/indirect-costs`).then(r => r.json()),
      ]);
      setData(detailRes);
      setDirectCosts(Array.isArray(dcRes) ? dcRes : []);
      const ocData = Array.isArray(ocRes) ? ocRes : [];
      const exData = Array.isArray(exRes) ? exRes : [];
      const icData = Array.isArray(icRes) ? icRes : [];
      setOutsourcing(ocData);
      setExpenses(exData);
      setIndirectCosts(icData);
      if (ocData.length > 0) setOcOpen(true);
      if (exData.length > 0) setExOpen(true);
      if (icData.length > 0) setIcOpen(true);
      if (detailRes.deal) {
        setDealForm({
          customer_id: detailRes.deal.customer_id ?? '',
          status: detailRes.deal.status ?? '',
          amount: detailRes.deal.amount ?? '',
          inspection_date: detailRes.deal.inspection_date ?? '',
        });
      }
      if (detailRes.meta) {
        setMetaForm({
          estimated_hours: detailRes.meta.estimated_hours != null ? Number(detailRes.meta.estimated_hours).toFixed(1) : '',
          estimated_labor: detailRes.meta.estimated_labor ?? '',
          estimated_outsourcing: detailRes.meta.estimated_outsourcing ?? '',
          estimated_expenses: detailRes.meta.estimated_expenses ?? '',
          estimated_indirect: detailRes.meta.estimated_indirect ?? '',
          notes: detailRes.meta.notes ?? '',
          project_code: detailRes.meta.project_code ?? '',
          order_date: detailRes.meta.order_date ?? '',
          acceptance_date: detailRes.meta.acceptance_date ?? '',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetch(`${API}/projects`).then(r => r.json()).then(data => setProjectIds(data.map(p => p.deal_id)));
    fetch(`${API}/customers`).then(r => r.json()).then(setCustomers);
  }, []);

  useEffect(() => { load(); }, [dealId]);

  const fmt = (n) => `¥${Math.round(Number(n || 0)).toLocaleString()}`;

  // 見積計算
  const estDirectCost = Number(metaForm.estimated_labor || 0) + Number(metaForm.estimated_outsourcing || 0) + Number(metaForm.estimated_expenses || 0);
  const estIndirect = Number(metaForm.estimated_indirect || 0);
  const estTotal = estDirectCost + estIndirect;

  const deleteMeta = async () => {
    if (!window.confirm('見積原価をリセットしますか？')) return;
    const empty = { estimated_hours: 0, estimated_labor: 0, estimated_outsourcing: 0, estimated_expenses: 0, estimated_indirect: 0, notes: '' };
    await fetch(`${API}/projects/${dealId}/meta`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(empty) });
    setMetaForm({ estimated_hours: '0.0', estimated_labor: '', estimated_outsourcing: '', estimated_expenses: '', estimated_indirect: '', notes: '' });
    setMetaEditing(false);
    await load();
  };

  const saveMeta = async () => {
    setMetaSaving(true);
    try {
      await fetch(`${API}/projects/${dealId}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimated_hours: Number(metaForm.estimated_hours) || 0,
          estimated_labor: Number(metaForm.estimated_labor) || 0,
          estimated_outsourcing: Number(metaForm.estimated_outsourcing) || 0,
          estimated_expenses: Number(metaForm.estimated_expenses) || 0,
          estimated_indirect: Number(metaForm.estimated_indirect) || 0,
          notes: metaForm.notes,
          project_code: metaForm.project_code,
          order_date: metaForm.order_date,
          acceptance_date: metaForm.acceptance_date,
        }),
      });
      setMetaEditing(false);
      await load();
    } catch (err) {
      console.error(err);
    }
    setMetaSaving(false);
  };

  // 直接費 CRUD
  const addDc = async () => {
    if (!dcForm.month || !dcForm.member) return;
    try {
      await fetch(`${API}/projects/${dealId}/direct-costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: dcForm.month,
          member: dcForm.member,
          hours: Number(dcForm.hours) || 0,
          unit_price: Number(dcForm.unit_price) || 0,
        }),
      });
      setDcForm({ month: '', member: '', hours: '', unit_price: '' });
      load();
    } catch (err) { console.error(err); }
  };

  const updateDc = async (id) => {
    if (!dcEditing) return;
    try {
      await fetch(`${API}/projects/direct-costs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: dcEditing.month,
          member: dcEditing.member,
          hours: Number(dcEditing.hours) || 0,
          unit_price: Number(dcEditing.unit_price) || 0,
        }),
      });
      setDcEditing(null);
      load();
    } catch (err) { console.error(err); }
  };

  const deleteDc = async (id) => {
    if (!window.confirm('削除しますか？')) return;
    try {
      await fetch(`${API}/projects/direct-costs/${id}`, { method: 'DELETE' });
      load();
    } catch (err) { console.error(err); }
  };

  // 外注費 CRUD
  const addOc = async () => {
    if (!ocForm.vendor) return;
    try {
      await fetch(`${API}/projects/${dealId}/outsourcing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: ocForm.date,
          vendor: ocForm.vendor,
          description: ocForm.description,
          amount: Number(ocForm.amount) || 0,
          notes: ocForm.notes,
        }),
      });
      setOcForm({ date: '', vendor: '', description: '', amount: '', notes: '' });
      load();
    } catch (err) { console.error(err); }
  };

  const updateOc = async (id) => {
    if (!ocEditing) return;
    try {
      await fetch(`${API}/projects/outsourcing/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: ocEditing.date,
          vendor: ocEditing.vendor,
          description: ocEditing.description,
          amount: Number(ocEditing.amount) || 0,
          notes: ocEditing.notes,
        }),
      });
      setOcEditing(null);
      load();
    } catch (err) { console.error(err); }
  };

  const deleteOc = async (id) => {
    if (!window.confirm('削除しますか？')) return;
    try {
      await fetch(`${API}/projects/outsourcing/${id}`, { method: 'DELETE' });
      load();
    } catch (err) { console.error(err); }
  };

  // 直接費を月別に集計
  const dcByMonth = directCosts.reduce((acc, r) => {
    if (r.month) acc[r.month] = (acc[r.month] || 0) + r.hours;
    return acc;
  }, {});

  // 間接費 CRUD
  const addIc = async () => {
    if (!icForm.month) return;
    const hours = dcByMonth[icForm.month] || 0;
    await fetch(`${API}/projects/${dealId}/indirect-costs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: icForm.month, unit_price: Number(icForm.unit_price) || 0, hours }),
    });
    setIcForm({ month: '', unit_price: '' });
    load();
  };

  const updateIc = async (id) => {
    if (!icEditing) return;
    const hours = dcByMonth[icEditing.month] || 0;
    await fetch(`${API}/projects/indirect-costs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: icEditing.month, unit_price: Number(icEditing.unit_price) || 0, hours }),
    });
    setIcEditing(null);
    load();
  };

  const deleteIc = async (id) => {
    if (!window.confirm('削除しますか？')) return;
    await fetch(`${API}/projects/indirect-costs/${id}`, { method: 'DELETE' });
    load();
  };

  const duplicateIc = async (row) => {
    const hours = dcByMonth[row.month] || 0;
    await fetch(`${API}/projects/${dealId}/indirect-costs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: row.month, unit_price: row.unit_price, hours }),
    });
    load();
  };

  const duplicateDc = async (row) => {
    await fetch(`${API}/projects/${dealId}/direct-costs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: row.month, member: row.member, hours: row.hours, unit_price: row.unit_price }),
    });
    load();
  };

  const duplicateOc = async (row) => {
    await fetch(`${API}/projects/${dealId}/outsourcing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: row.date, vendor: row.vendor, description: row.description, amount: row.amount, notes: row.notes }),
    });
    load();
  };

  const duplicateEx = async (row) => {
    await fetch(`${API}/projects/${dealId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: row.date, user_name: row.user_name, item: row.item, purpose: row.purpose, amount: row.amount }),
    });
    load();
  };

  // 経費 CRUD
  const addEx = async () => {
    if (!exForm.item) return;
    try {
      await fetch(`${API}/projects/${dealId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: exForm.date,
          user_name: exForm.user_name,
          item: exForm.item,
          purpose: exForm.purpose,
          amount: Number(exForm.amount) || 0,
        }),
      });
      setExForm({ date: '', user_name: '', item: '', purpose: '', amount: '' });
      load();
    } catch (err) { console.error(err); }
  };

  const updateEx = async (id) => {
    if (!exEditing) return;
    try {
      await fetch(`${API}/projects/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: exEditing.date,
          user_name: exEditing.user_name,
          item: exEditing.item,
          purpose: exEditing.purpose,
          amount: Number(exEditing.amount) || 0,
        }),
      });
      setExEditing(null);
      load();
    } catch (err) { console.error(err); }
  };

  const deleteEx = async (id) => {
    if (!window.confirm('削除しますか？')) return;
    try {
      await fetch(`${API}/projects/expenses/${id}`, { method: 'DELETE' });
      load();
    } catch (err) { console.error(err); }
  };

  if (!data) return <div style={{ color: 'var(--text-muted)', padding: '40px' }}>読み込み中...</div>;

  const { deal, meta, summary } = data;
  const light = ['excel', 'earth'].includes(document.body.dataset.theme || 'dark');
  const progressColor = summary.progress > 100 ? (light ? '#dc2626' : '#ff4d6a') : summary.progress > 80 ? (light ? '#b45309' : '#fbbf24') : (light ? '#1d6395' : '#00d4ff');
  const profitColor = summary.profit >= 0 ? (light ? '#16803a' : '#34d399') : (light ? '#dc2626' : '#ff4d6a');
  const actualHours = directCosts.reduce((s, r) => s + (Number(r.hours) || 0), 0);
  const estimatedHours = Number(metaForm.estimated_hours) || 0;
  const hoursProgress = estimatedHours > 0 ? (actualHours / estimatedHours * 100) : 0;
  const hoursProgressColor = hoursProgress > 100 ? (light ? '#dc2626' : '#ff4d6a') : hoursProgress > 80 ? (light ? '#b45309' : '#fbbf24') : (light ? '#1d6395' : '#00d4ff');

  const currentIdx = projectIds.indexOf(dealId);
  const prevId = currentIdx > 0 ? projectIds[currentIdx - 1] : null;
  const nextId = currentIdx >= 0 && currentIdx < projectIds.length - 1 ? projectIds[currentIdx + 1] : null;
  const navBtnStyle = (active) => ({ padding: '6px 14px', background: active ? 'var(--bg-input)' : 'var(--bg-inner)', border: '1px solid var(--border-mid)', color: active ? 'var(--text-body)' : 'var(--text-faint)', borderRadius: '6px', cursor: active ? 'pointer' : 'default', fontSize: '13px', fontFamily: "'Inter', sans-serif" });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <button className="btn-back" onClick={onBack}>← プロジェクト一覧に戻る</button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => prevId && onNavigate(prevId)} disabled={!prevId} style={navBtnStyle(!!prevId)}>← 前の案件</button>
          <button onClick={() => nextId && onNavigate(nextId)} disabled={!nextId} style={navBtnStyle(!!nextId)}>次の案件 →</button>
        </div>
      </div>
      <h2>{deal.title}</h2>

      {/* 1. プロジェクト情報 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>プロジェクト情報</h3>
          {!infoEditing && <button className="btn-edit" onClick={() => setInfoEditing(true)}>編集</button>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div>
            <span style={labelStyle}>顧客名</span>
            {infoEditing ? (
              <select style={inputStyle} value={dealForm.customer_id} onChange={e => setDealForm({ ...dealForm, customer_id: e.target.value })}>
                {customers.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
              </select>
            ) : (
              <div style={{ fontSize: '14px', color: 'var(--text-heading)' }}>{deal.customer_name}</div>
            )}
          </div>
          <div>
            <span style={labelStyle}>ステータス</span>
            {infoEditing ? (
              <select style={inputStyle} value={dealForm.status} onChange={e => setDealForm({ ...dealForm, status: e.target.value })}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ) : (
              <div><span style={{ fontSize: '13px', color: 'var(--text-td)' }}>{STATUS_LABELS[deal.status] || deal.status}</span></div>
            )}
          </div>
          <div>
            <span style={labelStyle}>受注額</span>
            {infoEditing ? (
              <input style={inputStyle} type="number" value={dealForm.amount} onChange={e => setDealForm({ ...dealForm, amount: e.target.value })} />
            ) : (
              <div style={{ fontSize: '16px', color: 'var(--accent)', fontWeight: 700 }}>{fmt(deal.amount)}</div>
            )}
          </div>
          <div>
            <span style={labelStyle}>検収月</span>
            {infoEditing ? (
              <select style={inputStyle} value={dealForm.inspection_date} onChange={e => setDealForm({ ...dealForm, inspection_date: e.target.value })}>
                <option value="">未設定</option>
                {INSPECTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <div style={{ fontSize: '14px', color: 'var(--text-heading)' }}>{deal.inspection_date || '-'}</div>
            )}
          </div>
          {infoEditing ? (
            <>
              <div>
                <span style={labelStyle}>プロジェクトコード</span>
                <input style={inputStyle} value={metaForm.project_code} onChange={e => setMetaForm({ ...metaForm, project_code: e.target.value })} placeholder="例: PRJ-2025-001" />
              </div>
              <div>
                <span style={labelStyle}>受注日</span>
                <input style={inputStyle} type="date" value={metaForm.order_date} onChange={e => setMetaForm({ ...metaForm, order_date: e.target.value })} />
              </div>
              <div>
                <span style={labelStyle}>検収完了日</span>
                <input style={inputStyle} type="date" value={metaForm.acceptance_date} onChange={e => setMetaForm({ ...metaForm, acceptance_date: e.target.value })} />
              </div>
            </>
          ) : (
            <>
              <div>
                <span style={labelStyle}>プロジェクトコード</span>
                <div style={{ fontSize: '14px', color: 'var(--text-heading)' }}>{metaForm.project_code || '-'}</div>
              </div>
              <div>
                <span style={labelStyle}>受注日</span>
                <div style={{ fontSize: '14px', color: 'var(--text-heading)' }}>{metaForm.order_date || '-'}</div>
              </div>
              <div>
                <span style={labelStyle}>検収完了日</span>
                <div style={{ fontSize: '14px', color: 'var(--text-heading)' }}>{metaForm.acceptance_date || '-'}</div>
              </div>
            </>
          )}
        </div>
        {infoEditing && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="btn-edit" onClick={async () => {
              await fetch(`${API}/deals/${dealId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customer_id: dealForm.customer_id,
                  status: dealForm.status,
                  amount: Number(dealForm.amount) || 0,
                  inspection_date: dealForm.inspection_date || null,
                }),
              });
              await saveMeta();
              setInfoEditing(false);
            }}>保存</button>
            <button className="btn-delete" onClick={() => setInfoEditing(false)}>キャンセル</button>
          </div>
        )}
      </div>

      {/* 2. 見積原価 + 3. 実績サマリー 横並び */}
      <div style={{ display: metaEditing ? 'block' : 'flex', gap: '16px', alignItems: 'flex-start' }}>

      {/* 2. 見積原価 */}
      <div className="card" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>見積原価</h3>
          {!metaEditing && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-edit" onClick={() => setMetaEditing(true)}>編集</button>
              <button className="btn-delete" onClick={deleteMeta}>削除</button>
            </div>
          )}
        </div>

        {metaEditing ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div style={sectionStyle}>
                <label style={labelStyle}>見積工数（h）</label>
                <input style={inputStyle} type="number" step="0.1" value={metaForm.estimated_hours} onChange={e => setMetaForm(f => ({ ...f, estimated_hours: e.target.value }))} />
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>見積労務費（¥）</label>
                <input style={inputStyle} type="number" value={metaForm.estimated_labor} onChange={e => setMetaForm(f => ({ ...f, estimated_labor: e.target.value }))} />
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>見積外注費（¥）</label>
                <input style={inputStyle} type="number" value={metaForm.estimated_outsourcing} onChange={e => setMetaForm(f => ({ ...f, estimated_outsourcing: e.target.value }))} />
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>見積経費（¥）</label>
                <input style={inputStyle} type="number" value={metaForm.estimated_expenses} onChange={e => setMetaForm(f => ({ ...f, estimated_expenses: e.target.value }))} />
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>見積製造間接費（¥）</label>
                <input style={inputStyle} type="number" value={metaForm.estimated_indirect} onChange={e => setMetaForm(f => ({ ...f, estimated_indirect: e.target.value }))} />
              </div>
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>メモ</label>
              <textarea style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }} value={metaForm.notes} onChange={e => setMetaForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button onClick={() => setMetaEditing(false)} style={{ padding: '8px 18px', background: 'none', border: '1px solid var(--border-mid)', color: 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>取消</button>
              <button onClick={saveMeta} disabled={metaSaving} style={{ padding: '8px 22px', background: 'var(--accent)', color: 'var(--bg-inner)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: "'Inter', sans-serif", fontWeight: 600, opacity: metaSaving ? 0.6 : 1 }}>
                {metaSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ background: 'var(--bg-inner)', borderRadius: '8px', padding: '16px' }}>
            <SummaryRow label="見積工数" value={`${Number(metaForm.estimated_hours || 0).toFixed(1)}h`} />
            <SummaryRow label="見積労務費" value={fmt(metaForm.estimated_labor)} />
            <SummaryRow label="見積外注費" value={fmt(metaForm.estimated_outsourcing)} />
            <SummaryRow label="見積経費" value={fmt(metaForm.estimated_expenses)} />
            <SummaryRow label="見積直接費合計" value={fmt(estDirectCost)} />
            <SummaryRow label="見積製造間接費" value={fmt(metaForm.estimated_indirect)} />
            <SummaryRow label="見積総原価" value={fmt(estTotal)} highlight={light ? '#1d6395' : '#00d4ff'} large />
            {metaForm.notes && <SummaryRow label="メモ" value={metaForm.notes} />}
          </div>
        )}
      </div>

      {/* 3. 実績サマリー */}
      <div className="card" style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ marginBottom: '16px' }}>実績サマリー</h3>
        <div style={{ background: 'var(--bg-inner)', borderRadius: '8px', padding: '16px' }}>
          <SummaryRow label="直接費（労務費）合計" value={fmt(summary.labor_total)} />
          <SummaryRow label="外注費合計" value={fmt(summary.outsourcing_total)} />
          <SummaryRow label="経費合計" value={fmt(summary.expenses_total)} />
          <SummaryRow label="直接費合計" value={fmt(summary.labor_total + summary.outsourcing_total + summary.expenses_total)} />
          <SummaryRow label="間接費" value={fmt(summary.indirect_total)} />
          <SummaryRow label="実績合計" value={fmt(summary.actual_total)} highlight="var(--text-heading)" large />
          <SummaryRow
            label="プロジェクト利益（受注額 - 実績合計）"
            value={`${summary.profit >= 0 ? '' : '-'}¥${Math.round(Math.abs(summary.profit)).toLocaleString()}`}
            highlight={profitColor}
            large
          />
          <SummaryRow
            label="コスト消化率（実績合計 / 受注額）"
            value={`${(summary.progress || 0).toFixed(1)}%`}
            highlight={progressColor}
          />
          <SummaryRow
            label={`工数進捗率（実績 ${actualHours.toFixed(2)}h / 見積 ${estimatedHours.toFixed(1)}h）`}
            value={estimatedHours > 0 ? `${hoursProgress.toFixed(1)}%` : '-'}
            highlight={estimatedHours > 0 ? hoursProgressColor : 'var(--text-muted)'}
          />
        </div>
      </div>

      </div>{/* end flex wrapper */}

      {/* 4. 直接費テーブル */}
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>直接費（労務費）</h3>

        <table>
          <thead>
            <tr>
              <th>製造月</th>
              <th>担当者</th>
              <th style={{ textAlign: 'right' }}>工数(h)</th>
              <th style={{ textAlign: 'right' }}>単価(¥)</th>
              <th style={{ textAlign: 'right' }}>労務費(¥)</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {directCosts.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '20px' }}>データがありません</td></tr>
            )}
            {directCosts.map(row => (
              <tr key={row.id}>
                {dcEditing && dcEditing.id === row.id ? (
                  <>
                    <td><input type="month" value={dcEditing.month} onChange={e => setDcEditing(v => ({ ...v, month: e.target.value }))} /></td>
                    <td><input type="text" value={dcEditing.member} onChange={e => setDcEditing(v => ({ ...v, member: e.target.value }))} /></td>
                    <td><input type="number" step="0.01" value={dcEditing.hours} onChange={e => setDcEditing(v => ({ ...v, hours: e.target.value }))} /></td>
                    <td><input type="number" value={dcEditing.unit_price} onChange={e => setDcEditing(v => ({ ...v, unit_price: e.target.value }))} /></td>
                    <td style={{ textAlign: 'right', color: 'var(--text-heading)' }}>{fmt(Number(dcEditing.hours || 0) * Number(dcEditing.unit_price || 0))}</td>
                    <td>
                      <button className="btn-edit" onClick={() => updateDc(row.id)}>保存</button>
                      <button className="btn-delete" onClick={() => setDcEditing(null)}>取消</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{row.month || '-'}</td>
                    <td>{row.member}</td>
                    <td style={{ textAlign: 'right' }}>{Number(row.hours).toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(row.unit_price)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-heading)', fontWeight: 600 }}>{fmt(row.hours * row.unit_price)}</td>
                    <td>
                      <button className="btn-edit" onClick={() => setDcEditing({ id: row.id, month: row.month, member: row.member, hours: row.hours, unit_price: row.unit_price })}>編集</button>
                      <button className="btn-delete" onClick={() => duplicateDc(row)} style={{ background: 'none', border: '1px solid var(--border-mid)', color: '#a78bfa', cursor: 'pointer', fontSize: '12px', fontFamily: "'Inter', sans-serif", fontWeight: 500, padding: '4px 10px', borderRadius: '4px', marginRight: '6px' }}>複製</button>
                      <button className="btn-delete" onClick={() => deleteDc(row.id)}>削除</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {directCosts.length > 0 && (
              <tr>
                <td colSpan={2} style={{ textAlign: 'right', color: 'var(--text-faint)', fontSize: '12px' }}>合計</td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {actualHours.toFixed(2)}
                </td>
                <td></td>
                <td style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 700 }}>
                  {fmt(directCosts.reduce((s, r) => s + r.hours * r.unit_price, 0))}
                </td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>

        {/* 追加フォーム（下部） */}
        <form
          onSubmit={e => { e.preventDefault(); addDc(); }}
          style={{ marginTop: '16px', display: 'flex', columnGap: '14px', rowGap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>製造月</label>
            <input type="month" value={dcForm.month} onChange={e => setDcForm(f => ({ ...f, month: e.target.value }))} style={{ ...inputStyle, width: 'auto' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>担当者</label>
            <input type="text" placeholder="担当者名" value={dcForm.member} onChange={e => setDcForm(f => ({ ...f, member: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>工数(h)</label>
              <input type="number" placeholder="0" step="0.01" value={dcForm.hours} onChange={e => setDcForm(f => ({ ...f, hours: e.target.value }))} style={{ ...inputStyle, width: '110px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>単価(¥)</label>
              <input type="number" placeholder="0" value={dcForm.unit_price} onChange={e => setDcForm(f => ({ ...f, unit_price: e.target.value }))} style={{ ...inputStyle, width: '130px' }} />
            </div>
          </div>
          <button type="submit" style={{ padding: '7px 18px', background: 'var(--accent)', color: 'var(--bg-inner)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>追加</button>
        </form>
      </div>

      {/* 5. 外注費テーブル */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: ocOpen ? '16px' : 0 }} onClick={() => setOcOpen(v => !v)}>
          <h3>外注費 {outsourcing.length > 0 && <span style={{ color: 'var(--accent)', fontWeight: 400, fontSize: '12px' }}>（{outsourcing.length}件）</span>}</h3>
          <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>{ocOpen ? '▲' : '▼'}</span>
        </div>
        {ocOpen && <table>
          <thead>
            <tr>
              <th>発生日</th>
              <th>外注先</th>
              <th>業務内容</th>
              <th style={{ textAlign: 'right' }}>外注金額(¥)</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {outsourcing.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '20px' }}>データがありません</td></tr>
            )}
            {outsourcing.map(row => (
              <tr key={row.id}>
                {ocEditing && ocEditing.id === row.id ? (
                  <>
                    <td><input type="date" value={ocEditing.date} onChange={e => setOcEditing(v => ({ ...v, date: e.target.value }))} /></td>
                    <td><input type="text" value={ocEditing.vendor} onChange={e => setOcEditing(v => ({ ...v, vendor: e.target.value }))} /></td>
                    <td><input type="text" value={ocEditing.description} onChange={e => setOcEditing(v => ({ ...v, description: e.target.value }))} /></td>
                    <td><input type="number" value={ocEditing.amount} onChange={e => setOcEditing(v => ({ ...v, amount: e.target.value }))} /></td>
                    <td>
                      <button className="btn-edit" onClick={() => updateOc(row.id)}>保存</button>
                      <button className="btn-delete" onClick={() => setOcEditing(null)}>取消</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{row.date || '-'}</td>
                    <td>{row.vendor}</td>
                    <td>{row.description}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-heading)', fontWeight: 600 }}>{fmt(row.amount)}</td>
                    <td>
                      <button className="btn-edit" onClick={() => setOcEditing({ id: row.id, date: row.date, vendor: row.vendor, description: row.description, amount: row.amount, notes: row.notes })}>編集</button>
                      <button className="btn-delete" onClick={() => duplicateOc(row)} style={{ background: 'none', border: '1px solid var(--border-mid)', color: '#a78bfa', cursor: 'pointer', fontSize: '12px', fontFamily: "'Inter', sans-serif", fontWeight: 500, padding: '4px 10px', borderRadius: '4px', marginRight: '6px' }}>複製</button>
                      <button className="btn-delete" onClick={() => deleteOc(row.id)}>削除</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {outsourcing.length > 0 && (
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', color: 'var(--text-faint)', fontSize: '12px' }}>合計</td>
                <td style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 700 }}>{fmt(outsourcing.reduce((s, r) => s + r.amount, 0))}</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>}
        {ocOpen && <form onSubmit={e => { e.preventDefault(); addOc(); }} style={{ marginTop: '16px', display: 'flex', columnGap: '14px', rowGap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>発生日</label>
            <input type="date" value={ocForm.date} onChange={e => setOcForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, width: 'auto' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>外注先</label>
            <input type="text" placeholder="外注先名" value={ocForm.vendor} onChange={e => setOcForm(f => ({ ...f, vendor: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 2, minWidth: '160px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>業務内容</label>
            <input type="text" placeholder="業務内容" value={ocForm.description} onChange={e => setOcForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '130px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>金額(¥)</label>
            <input type="number" placeholder="0" value={ocForm.amount} onChange={e => setOcForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} />
          </div>
          <button type="submit" style={{ padding: '7px 18px', background: 'var(--accent)', color: 'var(--bg-inner)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>追加</button>
        </form>}
      </div>

      {/* 6. 経費テーブル */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: exOpen ? '16px' : 0 }} onClick={() => setExOpen(v => !v)}>
          <h3>経費 {expenses.length > 0 && <span style={{ color: 'var(--accent)', fontWeight: 400, fontSize: '12px' }}>（{expenses.length}件）</span>}</h3>
          <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>{exOpen ? '▲' : '▼'}</span>
        </div>
        {exOpen && <table>
          <thead>
            <tr>
              <th>発生日</th>
              <th>利用者</th>
              <th>購入物</th>
              <th>用途</th>
              <th style={{ textAlign: 'right' }}>金額(¥)</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '20px' }}>データがありません</td></tr>
            )}
            {expenses.map(row => (
              <tr key={row.id}>
                {exEditing && exEditing.id === row.id ? (
                  <>
                    <td><input type="date" value={exEditing.date} onChange={e => setExEditing(v => ({ ...v, date: e.target.value }))} /></td>
                    <td><input type="text" value={exEditing.user_name} onChange={e => setExEditing(v => ({ ...v, user_name: e.target.value }))} /></td>
                    <td><input type="text" value={exEditing.item} onChange={e => setExEditing(v => ({ ...v, item: e.target.value }))} /></td>
                    <td><input type="text" value={exEditing.purpose} onChange={e => setExEditing(v => ({ ...v, purpose: e.target.value }))} /></td>
                    <td><input type="number" value={exEditing.amount} onChange={e => setExEditing(v => ({ ...v, amount: e.target.value }))} /></td>
                    <td>
                      <button className="btn-edit" onClick={() => updateEx(row.id)}>保存</button>
                      <button className="btn-delete" onClick={() => setExEditing(null)}>取消</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{row.date || '-'}</td>
                    <td>{row.user_name}</td>
                    <td>{row.item}</td>
                    <td>{row.purpose}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-heading)', fontWeight: 600 }}>{fmt(row.amount)}</td>
                    <td>
                      <button className="btn-edit" onClick={() => setExEditing({ id: row.id, date: row.date, user_name: row.user_name, item: row.item, purpose: row.purpose, amount: row.amount })}>編集</button>
                      <button className="btn-delete" onClick={() => duplicateEx(row)} style={{ background: 'none', border: '1px solid var(--border-mid)', color: '#a78bfa', cursor: 'pointer', fontSize: '12px', fontFamily: "'Inter', sans-serif", fontWeight: 500, padding: '4px 10px', borderRadius: '4px', marginRight: '6px' }}>複製</button>
                      <button className="btn-delete" onClick={() => deleteEx(row.id)}>削除</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {expenses.length > 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'right', color: 'var(--text-faint)', fontSize: '12px' }}>合計</td>
                <td style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 700 }}>{fmt(expenses.reduce((s, r) => s + r.amount, 0))}</td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>}
        {exOpen && <form onSubmit={e => { e.preventDefault(); addEx(); }} style={{ marginTop: '16px', display: 'flex', columnGap: '14px', rowGap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>発生日</label>
            <input type="date" value={exForm.date} onChange={e => setExForm(f => ({ ...f, date: e.target.value }))} style={{ ...inputStyle, width: 'auto' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '110px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>利用者</label>
            <input type="text" placeholder="氏名" value={exForm.user_name} onChange={e => setExForm(f => ({ ...f, user_name: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>購入物</label>
            <input type="text" placeholder="購入物・内容" value={exForm.item} onChange={e => setExForm(f => ({ ...f, item: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>用途</label>
            <input type="text" placeholder="用途" value={exForm.purpose} onChange={e => setExForm(f => ({ ...f, purpose: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '120px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>金額(¥)</label>
            <input type="number" placeholder="0" value={exForm.amount} onChange={e => setExForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} />
          </div>
          <button type="submit" style={{ padding: '7px 18px', background: 'var(--accent)', color: 'var(--bg-inner)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>追加</button>
        </form>}
      </div>

      {/* 7. 間接費テーブル */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: icOpen ? '16px' : 0 }} onClick={() => setIcOpen(v => !v)}>
          <h3>間接費 {indirectCosts.length > 0 && <span style={{ color: 'var(--accent)', fontWeight: 400, fontSize: '12px' }}>（{indirectCosts.length}件）</span>}</h3>
          <span style={{ color: 'var(--text-muted)', fontSize: '18px' }}>{icOpen ? '▲' : '▼'}</span>
        </div>
        {icOpen && <table>
          <thead>
            <tr>
              <th>該当月</th>
              <th style={{ textAlign: 'right' }}>単価(¥)</th>
              <th style={{ textAlign: 'right' }}>該当製造時間(h)</th>
              <th style={{ textAlign: 'right' }}>間接費(¥)</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {indirectCosts.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '20px' }}>データがありません</td></tr>
            )}
            {indirectCosts.map(row => (
              <tr key={row.id}>
                {icEditing && icEditing.id === row.id ? (
                  <>
                    <td><input type="month" value={icEditing.month} onChange={e => setIcEditing(v => ({ ...v, month: e.target.value }))} /></td>
                    <td><input type="number" value={icEditing.unit_price} onChange={e => setIcEditing(v => ({ ...v, unit_price: e.target.value }))} /></td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{(dcByMonth[icEditing.month] || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-heading)' }}>{fmt(Number(icEditing.unit_price || 0) * (dcByMonth[icEditing.month] || 0))}</td>
                    <td>
                      <button className="btn-edit" onClick={() => updateIc(row.id)}>保存</button>
                      <button className="btn-delete" onClick={() => setIcEditing(null)}>取消</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{row.month || '-'}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(row.unit_price)}</td>
                    <td style={{ textAlign: 'right' }}>{(dcByMonth[row.month] || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-heading)', fontWeight: 600 }}>{fmt(row.unit_price * (dcByMonth[row.month] || 0))}</td>
                    <td>
                      <button className="btn-edit" onClick={() => setIcEditing({ id: row.id, month: row.month, unit_price: row.unit_price })}>編集</button>
                      <button className="btn-delete" onClick={() => duplicateIc(row)} style={{ background: 'none', border: '1px solid var(--border-mid)', color: '#a78bfa', cursor: 'pointer', fontSize: '12px', fontFamily: "'Inter', sans-serif", fontWeight: 500, padding: '4px 10px', borderRadius: '4px', marginRight: '6px' }}>複製</button>
                      <button className="btn-delete" onClick={() => deleteIc(row.id)}>削除</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {indirectCosts.length > 0 && (
              <tr>
                <td></td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>合計</td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px' }}>
                  {indirectCosts.reduce((s, r) => s + (dcByMonth[r.month] || 0), 0).toFixed(2)}
                </td>
                <td style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 700 }}>
                  {fmt(indirectCosts.reduce((s, r) => s + r.unit_price * (dcByMonth[r.month] || 0), 0))}
                </td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>}
        {icOpen && <form onSubmit={e => { e.preventDefault(); addIc(); }} style={{ marginTop: '16px', display: 'flex', columnGap: '14px', rowGap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>該当月</label>
            <input type="month" value={icForm.month} onChange={e => setIcForm(f => ({ ...f, month: e.target.value }))} style={{ ...inputStyle, width: 'auto' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '120px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>単価(¥)</label>
            <input type="number" placeholder="0" value={icForm.unit_price} onChange={e => setIcForm(f => ({ ...f, unit_price: e.target.value }))} style={inputStyle} />
          </div>
          {icForm.month && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'center', paddingTop: '16px' }}>
              該当製造時間：{(dcByMonth[icForm.month] || 0).toFixed(2)}h（直接費から自動取得）
            </div>
          )}
          <button type="submit" style={{ padding: '7px 18px', background: 'var(--accent)', color: 'var(--bg-inner)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>追加</button>
        </form>}
      </div>
    </div>
  );
}
