import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';
import { BarChart2, Key, ShieldCheck, ShieldAlert, Clock, Tv } from 'lucide-react';

const BarRow = ({ label, value, max, color }) => (
  <div style={{ marginBottom: '0.75rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
      <span>{label}</span>
      <span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
    <div style={{ height: 8, borderRadius: 999, backgroundColor: 'var(--border-color)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${max > 0 ? (value / max) * 100 : 0}%`, backgroundColor: color, borderRadius: 999, transition: 'width 0.5s ease' }} />
    </div>
  </div>
);

const Analytics = () => {
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, revoked: 0, lifetime: 0, unused: 0 });
  const [channels, setChannels] = useState({ total: 0, categories: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubTokens = onValue(ref(database, 'access_tokens'), (snap) => {
      const data = snap.val() || {};
      const list = Object.values(data);
      const now = Date.now();
      const lifetimeCutoff = now + (50 * 365 * 24 * 60 * 60 * 1000);
      setStats({
        total: list.length,
        active: list.filter(t => t.isActive && t.expiresAt > now).length,
        expired: list.filter(t => t.isActive && t.expiresAt <= now).length,
        revoked: list.filter(t => !t.isActive).length,
        lifetime: list.filter(t => t.expiresAt > lifetimeCutoff).length,
        unused: list.filter(t => !t.deviceId).length,
      });
      setLoading(false);
    });

    const unsubCh = onValue(ref(database, 'channels'), (snap) => {
      setChannels(c => ({ ...c, total: Object.keys(snap.val() || {}).length }));
    });
    const unsubCat = onValue(ref(database, 'categories'), (snap) => {
      setChannels(c => ({ ...c, categories: Object.keys(snap.val() || {}).length }));
    });

    return () => { unsubTokens(); unsubCh(); unsubCat(); };
  }, []);

  const healthScore = stats.total > 0
    ? Math.round((stats.active / stats.total) * 100)
    : 0;

  const healthColor = healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="page-container">
      <div className="page-header">
        <h2><BarChart2 className="inline-icon" /> Analytics</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Statistik dan kesehatan sistem</p>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Loading analytics...</div>
      ) : (
        <>
          {/* Health Score */}
          <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>System Health Score</div>
            <div style={{ fontSize: 64, fontWeight: 900, color: healthColor, lineHeight: 1 }}>
              {healthScore}%
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: '0.5rem' }}>
              {stats.active} dari {stats.total} token sedang aktif
            </div>
            <div style={{ height: 10, borderRadius: 999, backgroundColor: 'var(--border-color)', overflow: 'hidden', marginTop: '1rem', maxWidth: 300, margin: '1rem auto 0' }}>
              <div style={{ height: '100%', width: `${healthScore}%`, backgroundColor: healthColor, borderRadius: 999 }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {/* Token Breakdown */}
            <div className="card">
              <h3 style={{ fontSize: '0.95rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Key size={18} color="var(--primary-color)" /> Token Breakdown
              </h3>
              <BarRow label="Active" value={stats.active} max={stats.total} color="#10b981" />
              <BarRow label="Expired" value={stats.expired} max={stats.total} color="#f59e0b" />
              <BarRow label="Revoked" value={stats.revoked} max={stats.total} color="#ef4444" />
              <BarRow label="Lifetime" value={stats.lifetime} max={stats.total} color="#8b5cf6" />
              <BarRow label="Unused (Unbound)" value={stats.unused} max={stats.total} color="#6b7280" />
            </div>

            {/* Content Stats */}
            <div className="card">
              <h3 style={{ fontSize: '0.95rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tv size={18} color="#8b5cf6" /> Content Overview
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { icon: Tv, label: 'Total Channels', value: channels.total, color: '#8b5cf6' },
                  { icon: BarChart2, label: 'Total Categories', value: channels.categories, color: '#3b82f6' },
                  { icon: Key, label: 'Total Tokens', value: stats.total, color: '#f59e0b' },
                  { icon: ShieldCheck, label: 'Active Tokens', value: stats.active, color: '#10b981' },
                  { icon: Clock, label: 'Unused Tokens', value: stats.unused, color: '#6b7280' },
                  { icon: ShieldAlert, label: 'Revoked Tokens', value: stats.revoked, color: '#ef4444' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                      <Icon size={15} color={color} /> {label}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 18, color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '1.5rem', padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            💡 Untuk analytics penonton channel (stream count, retention), aktifkan logging di aplikasi Android TV.
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
