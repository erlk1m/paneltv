import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';
import { Tv, Users, Key, ShieldCheck, ShieldAlert, Activity, Clock, Folder } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
    <div style={{
      width: 52, height: 52, borderRadius: 12,
      backgroundColor: color + '22',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>
      <Icon size={24} color={color} />
    </div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ color: color, fontSize: 12, marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalTokens: 0,
    activeTokens: 0,
    expiredTokens: 0,
    revokedTokens: 0,
    totalChannels: 0,
    totalCategories: 0,
    bannedDevices: 0,
  });
  const [recentTokens, setRecentTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let counts = { totalTokens: 0, activeTokens: 0, expiredTokens: 0, revokedTokens: 0 };

    const tokensRef = ref(database, 'access_tokens');
    const unsubTokens = onValue(tokensRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.values(data);
      const now = Date.now();
      counts.totalTokens = list.length;
      counts.activeTokens = list.filter(t => t.isActive && t.expiresAt > now).length;
      counts.expiredTokens = list.filter(t => t.isActive && t.expiresAt <= now).length;
      counts.revokedTokens = list.filter(t => !t.isActive).length;

      const sorted = Object.entries(data)
        .map(([k, v]) => ({ ...v, id: k }))
        .sort((a, b) => (b.createdAt || b.expiresAt) - (a.createdAt || a.expiresAt))
        .slice(0, 5);
      setRecentTokens(sorted);
      setStats(s => ({ ...s, ...counts }));
      setLoading(false);
    });

    const channelsRef = ref(database, 'channels');
    const unsubChannels = onValue(channelsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setStats(s => ({ ...s, totalChannels: Object.keys(data).length }));
    });

    const catsRef = ref(database, 'categories');
    const unsubCats = onValue(catsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setStats(s => ({ ...s, totalCategories: Object.keys(data).length }));
    });

    const bannedRef = ref(database, 'banned_devices');
    const unsubBanned = onValue(bannedRef, (snapshot) => {
      const data = snapshot.val() || {};
      setStats(s => ({ ...s, bannedDevices: Object.keys(data).length }));
    });

    return () => { unsubTokens(); unsubChannels(); unsubCats(); unsubBanned(); };
  }, []);

  const isLifetime = (exp) => exp > Date.now() + (50 * 365 * 24 * 60 * 60 * 1000);

  if (loading) return <div style={{ padding: '2rem' }}>Loading dashboard...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2><Activity className="inline-icon" /> Dashboard Overview</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Welcome to Erlkim IPTV Admin Panel
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard icon={Key} label="Total Tokens" value={stats.totalTokens} color="#3b82f6" />
        <StatCard icon={ShieldCheck} label="Active Tokens" value={stats.activeTokens} color="#10b981" sub="Berlaku & aktif" />
        <StatCard icon={Clock} label="Expired Tokens" value={stats.expiredTokens} color="#f59e0b" sub="Melewati tanggal" />
        <StatCard icon={ShieldAlert} label="Revoked Tokens" value={stats.revokedTokens} color="#ef4444" sub="Dinonaktifkan" />
        <StatCard icon={Tv} label="Total Channels" value={stats.totalChannels} color="#8b5cf6" sub="Di Firebase" />
        <StatCard icon={Folder} label="Folders" value={stats.totalCategories} color="#ec4899" sub="Kategori & Playlist" />
      </div>

      {/* Recent Tokens */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
          🕐 Token Terbaru
        </h3>
        {recentTokens.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Belum ada token.</p>
        ) : (
          <div>
            {recentTokens.map(token => {
              const deviceCount = token.devices ? Object.keys(token.devices).length : 0;
              const maxAllowed = token.maxDevices || 1;

              return (
                <div key={token.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{token.token}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
                      📱 {deviceCount} / {maxAllowed} Perangkat
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {isLifetime(token.expiresAt) ? '♾️ Lifetime' : new Date(token.expiresAt).toLocaleDateString('id-ID')}
                    </span>
                    <span style={{
                      padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      backgroundColor: token.isActive && token.expiresAt > Date.now()
                        ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: token.isActive && token.expiresAt > Date.now() ? '#10b981' : '#ef4444'
                    }}>
                      {token.isActive && token.expiresAt > Date.now() ? 'Active' : token.isActive ? 'Expired' : 'Revoked'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
