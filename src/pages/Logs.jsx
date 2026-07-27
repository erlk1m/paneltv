import React, { useState, useEffect } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { database } from '../firebase';
import { FileText, Trash2, Search, Filter } from 'lucide-react';

const ICONS = { login: '🔑', token_created: '✅', token_revoked: '🚫', token_deleted: '🗑️', ban: '⛔', unban: '✔️', error: '❌' };

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const unsubscribe = onValue(ref(database, 'logs'), (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data)
        .map(([k, v]) => ({ id: k, ...v }))
        .sort((a, b) => b.timestamp - a.timestamp);
      setLogs(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const clearLogs = () => {
    if (!window.confirm('Hapus semua log? Tindakan ini tidak dapat dibatalkan.')) return;
    remove(ref(database, 'logs')).catch(e => alert(e.message));
  };

  const filtered = logs.filter(log => {
    const matchSearch = search === '' || JSON.stringify(log).toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || log.type === filter;
    return matchSearch && matchFilter;
  });

  const logTypes = [...new Set(logs.map(l => l.type).filter(Boolean))];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2><FileText className="inline-icon" /> Logs</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Aktivitas login, token, dan sistem</p>
        </div>
        {logs.length > 0 && (
          <button className="btn btn-danger" onClick={clearLogs} style={{ fontSize: 13 }}>
            <Trash2 size={15} /> Clear All Logs
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="form-input" style={{ paddingLeft: '2rem' }} placeholder="Cari log..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} color="var(--text-secondary)" />
          <select className="form-input" style={{ width: 'auto', padding: '0.6rem 0.75rem' }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">Semua Tipe</option>
            {logTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading logs...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {logs.length === 0 ? '📋 Belum ada log. Log akan muncul otomatis saat ada aktivitas.' : 'Log tidak ditemukan.'}
          </div>
        ) : (
          <div>
            {filtered.map(log => (
              <div key={log.id} style={{
                display: 'flex', gap: '0.75rem', padding: '0.75rem 0',
                borderBottom: '1px solid var(--border-color)', alignItems: 'flex-start'
              }}>
                <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>
                  {ICONS[log.type] || '📌'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{log.message || log.type}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID') : '—'}
                    </div>
                  </div>
                  {log.detail && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, wordBreak: 'break-all' }}>{log.detail}</div>
                  )}
                  {log.deviceId && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>📱 Device: {log.deviceId}</div>
                  )}
                </div>
                <span style={{
                  flexShrink: 0, padding: '2px 8px', borderRadius: 999, fontSize: 11,
                  backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6'
                }}>
                  {log.type || 'system'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '1rem', padding: '0.75rem 1rem', fontSize: 12, color: 'var(--text-secondary)', backgroundColor: 'transparent', borderStyle: 'dashed' }}>
        💡 Log akan terisi otomatis dari aktivitas token di aplikasi Android TV. Total: {logs.length} log tercatat.
      </div>
    </div>
  );
};

export default Logs;
