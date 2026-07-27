import React, { useState, useEffect } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { database } from '../firebase';
import { Users, ShieldAlert, ShieldCheck, Trash2, Search } from 'lucide-react';

const UsersPage = () => {
  const [devices, setDevices] = useState([]);
  const [bannedDevices, setBannedDevices] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Collect unique device IDs from tokens
    const unsubTokens = onValue(ref(database, 'access_tokens'), (snapshot) => {
      const data = snapshot.val() || {};
      const deviceMap = {};
      Object.values(data).forEach(token => {
        if (token.deviceId) {
          if (!deviceMap[token.deviceId]) {
            deviceMap[token.deviceId] = { deviceId: token.deviceId, tokens: [] };
          }
          deviceMap[token.deviceId].tokens.push(token);
        }
      });
      setDevices(Object.values(deviceMap));
      setLoading(false);
    });

    const unsubBanned = onValue(ref(database, 'banned_devices'), (snapshot) => {
      setBannedDevices(snapshot.val() || {});
    });

    return () => { unsubTokens(); unsubBanned(); };
  }, []);

  const banDevice = (deviceId) => {
    set(ref(database, 'banned_devices/' + deviceId.replace(/[.#$[\]]/g, '_')), {
      deviceId,
      bannedAt: Date.now(),
      reason: 'Banned by admin'
    }).then(() => alert(`Device ${deviceId} dibanned!`))
      .catch(e => alert('Error: ' + e.message));
  };

  const unbanDevice = (deviceId) => {
    remove(ref(database, 'banned_devices/' + deviceId.replace(/[.#$[\]]/g, '_')))
      .then(() => alert(`Device ${deviceId} di-unban!`))
      .catch(e => alert('Error: ' + e.message));
  };

  const filtered = devices.filter(d =>
    d.deviceId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h2><Users className="inline-icon" /> User Management</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Device yang terdaftar lewat token aktif
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input
          className="form-input"
          style={{ paddingLeft: '2.25rem' }}
          placeholder="Cari Device ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Banned Devices summary */}
      {Object.keys(bannedDevices).length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #ef4444' }}>
          <h3 style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <ShieldAlert size={16} style={{ display: 'inline', marginRight: 6 }} />
            {Object.keys(bannedDevices).length} Device Banned
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {Object.values(bannedDevices).map(d => (
              <span key={d.deviceId} style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 12,
                backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444'
              }}>
                {d.deviceId}
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Loading users...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {search ? 'Device tidak ditemukan.' : 'Belum ada device yang terdaftar.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(device => {
            const isBanned = !!bannedDevices[device.deviceId.replace(/[.#$[\]]/g, '_')];
            const activeTokens = device.tokens.filter(t => t.isActive && t.expiresAt > Date.now());
            return (
              <div key={device.deviceId} className="card" style={{
                borderLeft: `4px solid ${isBanned ? '#ef4444' : '#10b981'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, wordBreak: 'break-all' }}>
                      📱 {device.deviceId}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                      {device.tokens.length} token terdaftar · {activeTokens.length} aktif
                    </div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {device.tokens.map(t => (
                        <span key={t.token} style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: 11,
                          backgroundColor: t.isActive && t.expiresAt > Date.now()
                            ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: t.isActive && t.expiresAt > Date.now() ? '#10b981' : '#ef4444'
                        }}>
                          {t.token}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    {isBanned ? (
                      <button className="btn btn-outline" onClick={() => unbanDevice(device.deviceId)}
                        style={{ fontSize: 13, padding: '6px 14px', color: '#10b981', borderColor: '#10b981' }}>
                        <ShieldCheck size={15} /> Unban
                      </button>
                    ) : (
                      <button className="btn btn-danger" onClick={() => banDevice(device.deviceId)}
                        style={{ fontSize: 13, padding: '6px 14px' }}>
                        <ShieldAlert size={15} /> Ban
                      </button>
                    )}
                  </div>
                </div>
                {isBanned && (
                  <div style={{
                    marginTop: '0.75rem', padding: '0.5rem 0.75rem',
                    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 6,
                    fontSize: 12, color: '#ef4444'
                  }}>
                    ⛔ Device ini sedang dibanned. Akses akan ditolak saat login.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UsersPage;
