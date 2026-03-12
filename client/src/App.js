import { useState } from 'react';
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

function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [projectDealId, setProjectDealId] = useState(null);

  const goToCustomer = (id) => {
    setSelectedCustomerId(id);
    setPage('customer-detail');
  };

  const goToCustomerList = () => {
    setSelectedCustomerId(null);
    setPage('customers');
  };

  const goToProject = (dealId) => {
    setProjectDealId(dealId);
    setPage('project-detail');
  };

  const goToProjectList = () => {
    setProjectDealId(null);
    setPage('projects');
  };

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">25期受託開発案件分析</div>
        <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>Dashboard</button>
        <button className={['customers', 'customer-detail'].includes(page) ? 'active' : ''} onClick={goToCustomerList}>顧客管理</button>
        <button className={page === 'deals' ? 'active' : ''} onClick={() => setPage('deals')}>案件管理</button>
        <button className={page === 'sales' ? 'active' : ''} onClick={() => setPage('sales')}>売上管理表</button>
        <button className={page === 'upper-half-sales' ? 'active' : ''} onClick={() => setPage('upper-half-sales')}>上期売上一覧</button>
        <button className={page === 'lower-half-sales' ? 'active' : ''} onClick={() => setPage('lower-half-sales')}>下期売上一覧</button>
        <button className={['projects', 'project-detail'].includes(page) ? 'active' : ''} onClick={goToProjectList}>プロジェクト管理</button>
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
