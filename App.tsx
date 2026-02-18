import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vault from './pages/Vault';
import AddEdit from './pages/AddEdit';
import Settings from './pages/Settings';
import { dbService } from './services/dbService';
import { CredentialItem } from './types';
import { useToast } from './context/ToastContext';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [items, setItems] = useState<CredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    dbService.setMasterKey(''); // clear key from memory
    setItems([]);
  }, []);

  // Inactivity Timer
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: number;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        handleLogout();
        showToast('장시간 활동이 없어 볼트가 잠겼습니다.', 'info');
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer(); // Start timer

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated, handleLogout, showToast]);

  // Check if session is already active (rare in reload, but good for structure)
  useEffect(() => {
    // In a real app, we might check sessionStorage for a temporary key, 
    // but here we force login on refresh for security.
    setLoading(false);
  }, []);

  const handleLogin = (derivedKey: string) => {
    try {
      dbService.setMasterKey(derivedKey);
      refreshData();
      setIsAuthenticated(true);
      showToast('볼트 잠금이 해제되었습니다.', 'success');
    } catch (e) {
      console.error(e);
      showToast('데이터베이스 잠금 해제에 실패했습니다.', 'error');
    }
  };

  const refreshData = () => {
    try {
      const data = dbService.getAllItems();
      setItems(data);
    } catch (e) {
      console.error("Error fetching items", e);
    }
  };

  const handleSaveItem = (item: CredentialItem) => {
    try {
      dbService.saveItem(item);
      refreshData();
      showToast('저장되었습니다.', 'success');
    } catch (e) {
      showToast('저장에 실패했습니다.', 'error');
    }
  };

  const handleDeleteItem = (id: string) => {
    try {
      dbService.deleteItem(id);
      refreshData();
      showToast('삭제되었습니다.', 'success');
    } catch (e) {
      showToast('삭제에 실패했습니다.', 'error');
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">로딩 중...</div>;

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard items={items} />} />
          <Route path="/vault" element={<Vault items={items} onDelete={handleDeleteItem} />} />
          <Route path="/add" element={<AddEdit onSave={handleSaveItem} />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;