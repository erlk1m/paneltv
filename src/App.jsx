import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { LayoutDashboard, Tv, Settings as SettingsIcon, LogOut, Loader, Key, Users, CreditCard, BookOpen, BarChart2, FileText, Code2, Menu, X } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import Settings from './pages/Settings';
import Tokens from './pages/Tokens';
import UsersPage from './pages/Users';
import Subscriptions from './pages/Subscriptions';
import EPG from './pages/EPG';
import Analytics from './pages/Analytics';
import Logs from './pages/Logs';
import ApiKeys from './pages/ApiKeys';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/channels', icon: Tv, label: 'Channels' },
  { path: '/tokens', icon: Key, label: 'Tokens' },
  { path: '/users', icon: Users, label: 'Users' },
  { path: '/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { path: '/epg', icon: BookOpen, label: 'EPG' },
  { path: '/analytics', icon: BarChart2, label: 'Analytics' },
  { path: '/logs', icon: FileText, label: 'Logs' },
  { path: '/apikeys', icon: Code2, label: 'API Keys' },
  { path: '/settings', icon: SettingsIcon, label: 'Settings' },
];

const ProtectedRoute = ({ children, user }) => {
  if (!user) return <Navigate to="/login" />;
  return children;
};

const Layout = ({ children, onLogout }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Erlkim Admin</span>
          <button
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav" style={{ overflowY: 'auto', flex: 1 }}>
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={`nav-item ${location.pathname === path ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span className="nav-text">{label}</span>
            </Link>
          ))}
          <button
            onClick={() => { setMobileOpen(false); onLogout(); }}
            className="nav-item logout-btn"
            style={{ background: 'transparent', border: 'none', width: 'auto', color: 'var(--danger-color)', cursor: 'pointer' }}
          >
            <LogOut size={19} />
            <span className="nav-text">Logout</span>
          </button>
        </nav>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }}
        />
      )}

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}>
        {/* Mobile Top Bar */}
        <div className="mobile-topbar">
          <button
            onClick={() => setMobileOpen(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 4 }}
          >
            <Menu size={24} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-color)' }}>Erlkim Admin</span>
          <button
            onClick={onLogout}
            style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: 4 }}
          >
            <LogOut size={20} />
          </button>
        </div>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        <Route path="/" element={<ProtectedRoute user={user}><Layout onLogout={handleLogout}><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/channels" element={<ProtectedRoute user={user}><Layout onLogout={handleLogout}><Channels /></Layout></ProtectedRoute>} />
        <Route path="/tokens" element={<ProtectedRoute user={user}><Layout onLogout={handleLogout}><Tokens /></Layout></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute user={user}><Layout onLogout={handleLogout}><UsersPage /></Layout></ProtectedRoute>} />
        <Route path="/subscriptions" element={<ProtectedRoute user={user}><Layout onLogout={handleLogout}><Subscriptions /></Layout></ProtectedRoute>} />
        <Route path="/epg" element={<ProtectedRoute user={user}><Layout onLogout={handleLogout}><EPG /></Layout></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute user={user}><Layout onLogout={handleLogout}><Analytics /></Layout></ProtectedRoute>} />
        <Route path="/logs" element={<ProtectedRoute user={user}><Layout onLogout={handleLogout}><Logs /></Layout></ProtectedRoute>} />
        <Route path="/apikeys" element={<ProtectedRoute user={user}><Layout onLogout={handleLogout}><ApiKeys /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute user={user}><Layout onLogout={handleLogout}><Settings /></Layout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
