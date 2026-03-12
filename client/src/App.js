import { useState, useEffect } from 'react';
import { exportPPT } from './utils/exportPPT';
import Dashboard from './components/Dashboard';
import CustomerList from './components/CustomerList';
import CustomerDetail from './components/CustomerDetail';
import DealList from './components/DealList';
import SalesTable from './components/SalesTable';
import UpperHalfSales from './components/UpperHalfSales';
import LowerHalfSales from './components/LowerHalfSales';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import './App.css';

const THEMES = [
  { id: 'dark',  label: 'ダーク',   cls: 't-dark',  swatch: ['#0d1120','#1e2a45','#00d4ff'] },
  { id: 'excel', label: 'エクセル', cls: 't-excel', swatch: ['#1f3864','#ffffff','#2e75b6'] },
  { id: 'earth', label: 'アース',   cls: 't-earth', swatch: ['#3d2b1f','#faf6ef','#b5651d'] },
];

function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [projectDealId, setProjectDealId] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('crm-theme') || 'dark');
  const [generatingPPT, setGeneratingPPT] = useState(false);

  const handleExportPPT = async () => {
    setGeneratingPPT(true);
    try { await exportPPT(); } catch(e) { console.error(e); alert('PPT生成に失敗しました'); }
    finally { setGeneratingPPT(false); }
  };

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('crm-theme', theme);
  }, [theme]);

  const goToCustomer = (id) => { setSelectedCustomerId(id); setPage('customer-detail'); };
  const goToCustomerList = () => { setSelectedCustomerId(null); setPage('customers'); };
  const goToProject = (dealId) => { setProjectDealId(dealId); setPage('project-detail'); };
  const goToProjectList = () => { setProjectDealId(null); setPage('projects'); };

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">25期受託開発案件分析</div>

        {/* テーマ切替 */}
        <div className="theme-switcher">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`theme-card${theme === t.id ? ' active' : ''}`}
              onClick={() => { document.body.setAttribute('data-theme', t.id); setTheme(t.id); }}
              title={t.label}
            >
              <div className="theme-card-preview">
                <div className="theme-card-sidebar" style={{ background: t.swatch[0] }} />
                <div className="theme-card-body" style={{ background: t.swatch[1] }}>
                  <div className="theme-card-bar" style={{ background: t.swatch[2], opacity: 0.9 }} />
                  <div className="theme-card-bar short" style={{ background: t.swatch[2], opacity: 0.5 }} />
                </div>
              </div>
            </button>
          ))}
        </div>

        <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>Dashboard</button>
        <button className={['customers', 'customer-detail'].includes(page) ? 'active' : ''} onClick={goToCustomerList}>顧客管理</button>
        <button className={page === 'deals' ? 'active' : ''} onClick={() => setPage('deals')}>案件管理</button>
        <button className={page === 'sales' ? 'active' : ''} onClick={() => setPage('sales')}>売上管理表</button>
        <button className={page === 'upper-half-sales' ? 'active' : ''} onClick={() => setPage('upper-half-sales')}>上期売上一覧</button>
        <button className={page === 'lower-half-sales' ? 'active' : ''} onClick={() => setPage('lower-half-sales')}>下期売上一覧</button>
        <button className={['projects', 'project-detail'].includes(page) ? 'active' : ''} onClick={goToProjectList}>プロジェクト管理</button>

        <div style={{ marginTop: 'auto', padding: '16px 16px 8px' }}>
          <button
            onClick={handleExportPPT}
            disabled={generatingPPT}
            style={{
              width: '100%', padding: '10px 0',
              background: generatingPPT ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '7px',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '13px', fontWeight: 600, fontFamily: 'Inter,sans-serif',
              cursor: generatingPPT ? 'default' : 'pointer',
              transition: 'all 0.15s',
              opacity: generatingPPT ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!generatingPPT) e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = generatingPPT ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'; }}
          >
            {generatingPPT ? '生成中...' : '📊 会議資料生成'}
          </button>
        </div>
      </nav>
      <main className="content">
        {page === 'dashboard' && <Dashboard />}
        {page === 'customers' && <CustomerList onSelect={goToCustomer} />}
        {page === 'customer-detail' && <CustomerDetail customerId={selectedCustomerId} onBack={goToCustomerList} onNavigate={goToCustomer} />}
        {page === 'deals' && <DealList />}
        {page === 'sales' && <SalesTable />}
        {page === 'upper-half-sales' && <UpperHalfSales />}
        {page === 'lower-half-sales' && <LowerHalfSales />}
        {page === 'projects' && <ProjectList onSelect={goToProject} />}
        {page === 'project-detail' && <ProjectDetail dealId={projectDealId} onBack={goToProjectList} onNavigate={goToProject} />}
      </main>
    </div>
  );
}

export default App;
