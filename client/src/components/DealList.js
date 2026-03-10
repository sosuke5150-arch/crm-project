import { useEffect, useRef, useState } from 'react';

const API = 'http://localhost:3001';

const STATUS_LABELS = { proposing: '提案中', planned: '提案予定', won: '受注', developing: '開発中', monthly: '月額', done: '完了', forecast: '見込' };
const STATUS_COLORS = { developing: '#facc15', forecast: '#ff4d6a' };

const INSPECTION_OPTIONS = ['9月検収','10月検収','11月検収','12月検収','1月検収','2月検収','3月検収','4月検収','5月検収','6月検収','7月検収','8月検収'];

const emptyForm = { customer_id: '', title: '', status: 'proposing', amount: '', inspection_date: '', topics: '' };

const currentMonth = `${new Date().getMonth() + 1}月検収`;

const MONTH_COLORS = {
  '9月検収':  '#e879f9',
  '10月検収': '#84cc16',
  '11月検収': '#38bdf8',
  '12月検収': '#06b6d4',
  '1月検収':  '#f59e0b',
  '2月検収':  '#34d399',
  '3月検収':  '#facc15',
  '4月検収':  '#fb923c',
  '5月検収':  '#2dd4bf',
  '6月検収':  '#f43f5e',
  '7月検収':  '#ec4899',
  '8月検収':  '#a78bfa',
  [currentMonth]: '#00d4ff',
};

const getMonthColor = (monthName) => MONTH_COLORS[monthName] || null;

// タグ入力コンポーネント（サジェスト付き）
function TagFilter({ placeholder, tags, onAdd, onRemove, suggestions = [] }) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = input.trim()
    ? suggestions.filter(s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s))
    : [];

  const add = (val) => {
    const v = (val || input).trim();
    if (v && !tags.includes(v)) onAdd(v);
    setInput('');
    setOpen(false);
  };

  // 外クリックで閉じる
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ display:'flex', flexDirection:'column', gap:'4px', flex:1, minWidth:'140px', position:'relative' }}>
      <div style={{ display:'flex', gap:'4px' }}>
        <input
          placeholder={placeholder}
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          style={{ flex:1, padding:'7px 10px', background:'#0d1120', border:'1px solid #1e2a45', borderRadius:'6px', color:'#c9d1e8', fontSize:'12px', fontFamily:'Inter,sans-serif', minWidth:0 }}
        />
        <button onClick={() => add()} style={{ padding:'7px 10px', background:'#0d1120', border:'1px solid #1e2a45', borderRadius:'6px', color:'#00d4ff', cursor:'pointer', fontSize:'14px', lineHeight:1 }}>＋</button>
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position:'absolute', top:'36px', left:0, right:'36px', background:'#0d1120', border:'1px solid #1e2a45', borderRadius:'6px', zIndex:100, maxHeight:'180px', overflowY:'auto' }}>
          {filtered.map(s => (
            <div key={s} onMouseDown={() => add(s)} style={{ padding:'8px 12px', fontSize:'12px', color:'#c9d1e8', cursor:'pointer', borderBottom:'1px solid #131825' }}
              onMouseEnter={e => e.target.style.background='rgba(0,212,255,0.08)'}
              onMouseLeave={e => e.target.style.background='transparent'}
            >
              {s}
            </div>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
          {tags.map(t => (
            <span key={t} style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 8px', background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:'12px', fontSize:'11px', color:'#00d4ff' }}>
              {t}
              <span onClick={() => onRemove(t)} style={{ cursor:'pointer', opacity:0.7, fontSize:'13px', lineHeight:1 }}>×</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// プルダウン複数選択コンポーネント
function SelectFilter({ placeholder, options, tags, onAdd, onRemove }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'4px', flex:1, minWidth:'140px' }}>
      <select
        value=""
        onChange={e => { if (e.target.value && !tags.includes(e.target.value)) onAdd(e.target.value); }}
        style={{ padding:'7px 10px', background:'#0d1120', border:'1px solid #1e2a45', borderRadius:'6px', color: tags.length ? '#c9d1e8' : '#3d4f6e', fontSize:'12px', fontFamily:'Inter,sans-serif' }}
      >
        <option value="">{placeholder}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {tags.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
          {tags.map(t => {
            const label = options.find(([v]) => v === t)?.[1] || t;
            return (
              <span key={t} style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 8px', background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:'12px', fontSize:'11px', color:'#00d4ff' }}>
                {label}
                <span onClick={() => onRemove(t)} style={{ cursor:'pointer', opacity:0.7, fontSize:'13px', lineHeight:1 }}>×</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DealList() {
  const [deals, setDeals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ customer: [], title: [], status: [], inspection_date: [], topics: [] });
  const addFilter = (key, val) => setFilters(f => ({ ...f, [key]: [...f[key], val] }));
  const removeFilter = (key, val) => setFilters(f => ({ ...f, [key]: f[key].filter(v => v !== val) }));
  const clearFilters = () => setFilters({ customer: [], title: [], status: [], inspection_date: [], topics: [] });
  const dragIndex = useRef(null);
  const currentMonthRef = useRef(null);

  const load = () => {
    fetch(`${API}/deals`).then(r => r.json()).then(data => {
      setDeals(data);
    });
    fetch(`${API}/customers`).then(r => r.json()).then(setCustomers);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (currentMonthRef.current) {
      currentMonthRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [deals]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API}/deals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm(emptyForm);
    load();
  };

  const handleStatus = async (id, status) => {
    await fetch(`${API}/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('削除しますか？')) return;
    await fetch(`${API}/deals/${id}`, { method: 'DELETE' });
    load();
  };

  const handleDuplicate = async (d) => {
    await fetch(`${API}/deals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: d.customer_id,
        title: d.title,
        status: d.status,
        amount: d.amount,
        inspection_date: d.inspection_date,
        topics: d.topics,
      }),
    });
    load();
  };

  const handleEditStart = (d) => {
    setEditId(d.id);
    setEditForm({
      customer_id: d.customer_id,
      title: d.title,
      status: d.status,
      amount: d.amount || '',
      inspection_date: d.inspection_date || '',
      topics: d.topics || '',
    });
  };

  const handleDragStart = (index) => {
    dragIndex.current = index;
  };

  const handleDrop = async (dropIndex) => {
    if (dragIndex.current === null || dragIndex.current === dropIndex) return;
    const updated = [...deals];
    const [moved] = updated.splice(dragIndex.current, 1);
    updated.splice(dropIndex, 0, moved);
    dragIndex.current = null;
    setDeals(updated);
    await fetch(`${API}/deals/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: updated.map(d => d.id) }),
    });
  };

  const handleEditSave = async (id) => {
    await fetch(`${API}/deals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditId(null);
    load();
  };

  const match = (tags, value) => tags.length === 0 || tags.some(t => value.toLowerCase().includes(t.toLowerCase()));
  const matchExact = (tags, value) => tags.length === 0 || tags.includes(value);
  const filtered = deals.filter(d =>
    match(filters.customer, d.customer_name || '') &&
    match(filters.title, d.title || '') &&
    matchExact(filters.status, d.status || '') &&
    matchExact(filters.inspection_date, d.inspection_date || '') &&
    match(filters.topics, d.topics || '')
  );

  return (
    <div>
      <h2>案件管理　売上一覧</h2>
      <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap', alignItems:'flex-start' }}>
        <TagFilter placeholder="顧客" tags={filters.customer} onAdd={v => addFilter('customer', v)} onRemove={v => removeFilter('customer', v)} suggestions={[...new Set(deals.map(d => d.customer_name).filter(Boolean))]} />
        <TagFilter placeholder="案件名" tags={filters.title} onAdd={v => addFilter('title', v)} onRemove={v => removeFilter('title', v)} suggestions={[...new Set(deals.map(d => d.title).filter(Boolean))]} />
        <SelectFilter placeholder="ステータス" options={Object.entries(STATUS_LABELS)} tags={filters.status} onAdd={v => addFilter('status', v)} onRemove={v => removeFilter('status', v)} />
        <SelectFilter placeholder="検収月" options={INSPECTION_OPTIONS.map(o => [o, o])} tags={filters.inspection_date} onAdd={v => addFilter('inspection_date', v)} onRemove={v => removeFilter('inspection_date', v)} />
        <TagFilter placeholder="トピックス" tags={filters.topics} onAdd={v => addFilter('topics', v)} onRemove={v => removeFilter('topics', v)} suggestions={[...new Set(deals.map(d => d.topics).filter(Boolean))]} />
        {Object.values(filters).some(v => v.length > 0) && (
          <button onClick={clearFilters} style={{ padding:'7px 14px', background:'none', border:'1px solid #2a3a58', borderRadius:'6px', color:'#6b7fa3', cursor:'pointer', fontSize:'12px', fontFamily:'Inter,sans-serif', alignSelf:'flex-start' }}>
            クリア
          </button>
        )}
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th></th><th>顧客</th><th>案件名</th><th>ステータス</th><th>金額</th><th>検収月</th><th>トピックス</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((d, index) => editId === d.id ? (
              <tr key={d.id}>
                <td></td>
                <td>
                  <select value={editForm.customer_id} onChange={e => setEditForm({...editForm, customer_id: e.target.value})}>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                  </select>
                </td>
                <td><input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} style={{width:'100%'}} /></td>
                <td>
                  <select className="status-select" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} style={STATUS_COLORS[editForm.status] ? { color: STATUS_COLORS[editForm.status] } : {}}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </td>
                <td><input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} style={{width:'100%'}} /></td>
                <td>
                  <select value={editForm.inspection_date} onChange={e => setEditForm({...editForm, inspection_date: e.target.value})}>
                    <option value=""></option>
                    {INSPECTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td><textarea value={editForm.topics} onChange={e => setEditForm({...editForm, topics: e.target.value})} rows={2} style={{width:'100%', resize:'vertical'}} /></td>
                <td style={{whiteSpace:'nowrap'}}>
                  <button className="btn-edit" onClick={() => handleEditSave(d.id)}>保存</button>
                  <button className="btn-delete" onClick={() => setEditId(null)}>キャンセル</button>
                </td>
              </tr>
            ) : (
              <tr
                key={d.id}
                ref={d.inspection_date === currentMonth && filtered.findIndex(x => x.inspection_date === currentMonth) === index ? currentMonthRef : null}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                style={{ cursor: 'grab' }}
              >
                {(() => {
                  const c = getMonthColor(d.inspection_date);
                  const s = c ? { color: c } : {};
                  return (<>
                    <td style={{color:'#3d4f6e', fontSize:'16px', cursor:'grab'}}>⠿</td>
                    <td style={s}>{d.customer_name}</td>
                    <td style={s}>{d.title}</td>
                    <td>
                      <select className="status-select" value={d.status} onChange={e => handleStatus(d.id, e.target.value)} style={STATUS_COLORS[d.status] ? { color: STATUS_COLORS[d.status] } : {}}>
                        {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td style={{...s, textAlign:'right'}}>{d.amount ? `¥${Number(d.amount).toLocaleString()}` : '-'}</td>
                    <td style={s}>{d.inspection_date || '-'}</td>
                    <td style={{...s, whiteSpace:'pre-wrap', maxWidth:'200px'}}>{d.topics || '-'}</td>
                    <td style={{whiteSpace:'nowrap'}}>
                      <button className="btn-edit" onClick={() => handleEditStart(d)}>修正</button>
                      <button className="btn-edit" onClick={() => handleDuplicate(d)}>複製</button>
                      <button className="btn-delete" onClick={() => handleDelete(d.id)}>削除</button>
                    </td>
                  </>);
                })()}
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} style={{textAlign:'center',color:'#4a5f82'}}>{Object.values(filters).some(f => f.length > 0) ? '検索結果がありません' : '案件データがありません'}</td></tr>}

            {filtered.length > 0 && (
              <tr>
                <td colSpan={4} style={{textAlign:'right', color:'#6b7fa3', fontWeight:600, paddingTop:'16px'}}>合計</td>
                <td style={{color:'#00d4ff', fontWeight:700, paddingTop:'16px', textAlign:'right'}}>
                  ¥{filtered.reduce((sum, d) => sum + (Number(d.amount) || 0), 0).toLocaleString()}
                </td>
                <td colSpan={3}></td>
              </tr>
            )}
          </tbody>
        </table>
        <datalist id="title-suggestions">
          {[...new Set(deals.map(d => d.title).filter(Boolean))].map(t => <option key={t} value={t} />)}
        </datalist>
        <datalist id="topics-suggestions">
          {[...new Set(deals.map(d => d.topics).filter(Boolean))].map(t => <option key={t} value={t} />)}
        </datalist>
        <form onSubmit={handleSubmit} style={{marginTop:'16px', marginBottom:0}}>
          <select value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} required>
            <option value="">顧客を選択 *</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
          </select>
          <input placeholder="案件名 *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} list="title-suggestions" required />
          <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="number" placeholder="金額（円）" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
          <select value={form.inspection_date} onChange={e => setForm({...form, inspection_date: e.target.value})}>
            <option value="">検収月</option>
            {INSPECTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <input placeholder="トピックス" value={form.topics} onChange={e => setForm({...form, topics: e.target.value})} list="topics-suggestions" />
          <button type="submit">追加</button>
        </form>
      </div>
    </div>
  );
}
