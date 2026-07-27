import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { LayoutDashboard, Tv, Settings as SettingsIcon, LogOut, Loader } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import Settings from './pages/Settings';
import Tokens from './pages/Tokens';
import { Key } from 'lucide-react';

const ProtectedRoute = ({ children, user }) => {
  if (!user) return <Navigate to="/login" />;
  return children;
};

const Layout = ({ children, onLogout }) => {
  const location = useLocation();
  
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          Erlkim Admin
        </div>
        <nav className="sidebar-nav">
          <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span className="nav-text">Dashboard</span>
          </Link>
          <Link to="/channels" className={`nav-item ${location.pathname === '/channels' ? 'active' : ''}`}>
            <Tv size={20} />
            <span className="nav-text">Channels</span>
          </Link>
          <Link to="/tokens" className={`nav-item ${location.pathname === '/tokens' ? 'active' : ''}`}>
            <Key size={20} />
            <span className="nav-text">Tokens</span>
          </Link>
          <Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}>
            <SettingsIcon size={20} />
            <span className="nav-text">Settings</span>
          </Link>
          <button onClick={onLogout} className="nav-item logout-btn" style={{ background: 'transparent', border: 'none', width: 'auto', color: 'var(--danger-color)' }}>
            <LogOut size={20} />
            <span className="nav-text">Logout</span>
          </button>
        </nav>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check custom admin first
    const isCustomAdmin = localStorage.getItem('customAdmin') === 'true';
    if (isCustomAdmin) {
      setUser({ email: 'admin', uid: 'custom-admin' });
      setLoading(false);
    }
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!isCustomAdmin) {
        setUser(currentUser);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)' }}>
        <Loader className="animate-spin" color="var(--primary-color)" size={48} />
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('customAdmin');
    setUser(null);
    signOut(auth);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        
        <Route path="/" element={
          <ProtectedRoute user={user}>
            <Layout onLogout={handleLogout}>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/channels" element={
          <ProtectedRoute user={user}>
            <Layout onLogout={handleLogout}>
              <Channels />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/tokens" element={
          <ProtectedRoute user={user}>
            <Layout onLogout={handleLogout}>
              <Tokens />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute user={user}>
            <Layout onLogout={handleLogout}>
              <Settings />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
