import { useState } from 'react';
import Dashboard from './components/Dashboard';
import CustomerList from './components/CustomerList';
import DealList from './components/DealList';
import './App.css';

function App() {
  const [page, setPage] = useState('dashboard');

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">CRM</div>
        <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>ダッシュボード</button>
        <button className={page === 'customers' ? 'active' : ''} onClick={() => setPage('customers')}>顧客管理</button>
        <button className={page === 'deals' ? 'active' : ''} onClick={() => setPage('deals')}>案件管理</button>
      </nav>
      <main className="content">
        {page === 'dashboard' && <Dashboard />}
        {page === 'customers' && <CustomerList />}
        {page === 'deals' && <DealList />}
      </main>
    </div>
  );
}

export default App;
