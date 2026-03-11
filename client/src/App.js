import { useState } from 'react';
import Dashboard from './components/Dashboard';
import CustomerList from './components/CustomerList';
import CustomerDetail from './components/CustomerDetail';
import DealList from './components/DealList';
import SalesTable from './components/SalesTable';
import './App.css';

function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const goToCustomer = (id) => {
    setSelectedCustomerId(id);
    setPage('customer-detail');
  };

  const goToCustomerList = () => {
    setSelectedCustomerId(null);
    setPage('customers');
  };

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">25期受託開発案件分析</div>
        <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>Dashboard</button>
        <button className={['customers', 'customer-detail'].includes(page) ? 'active' : ''} onClick={goToCustomerList}>顧客管理</button>
        <button className={page === 'deals' ? 'active' : ''} onClick={() => setPage('deals')}>案件管理</button>
        <button className={page === 'sales' ? 'active' : ''} onClick={() => setPage('sales')}>売上管理表</button>
      </nav>
      <main className="content">
        {page === 'dashboard' && <Dashboard />}
        {page === 'customers' && <CustomerList onSelect={goToCustomer} />}
        {page === 'customer-detail' && <CustomerDetail customerId={selectedCustomerId} onBack={goToCustomerList} />}
        {page === 'deals' && <DealList />}
        {page === 'sales' && <SalesTable />}
      </main>
    </div>
  );
}

export default App;
