import React, { useState, useEffect } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { database } from '../firebase';
import { Users, ShieldAlert, ShieldCheck, Search, Clock, ListFilter, X, Activity } from 'lucide-react';

const UsersPage = () => {
  const [devices, setDevices] = useState([]);
  const [bannedDevices, setBannedDevices] = useState({});
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null); // For Activity Modal

  useEffect(() => {
    // 1. Get Logs first to calculate last seen
    const unsubLogs = onValue(ref(database, 'logs'), (snapshot) => {
      const data = snapshot.val() || {};
      const logsList = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
      setLogs(logsList);

      // 2. Get Tokens to identify devices
      const unsubTokens = onValue(ref(database, 'access_tokens'), (snapTokens) => {
        const tokenData = snapTokens.val() || {};
        const deviceMap = {};

        Object.values(tokenData).forEach(token => {
          // Check linked deviceId in token (primary)
          if (token.deviceId) {
            if (!deviceMap[token.deviceId]) {
              deviceMap[token.deviceId] = { deviceId: token.deviceId, tokens: [], activityCount: 0, lastSeen: 0 };
            }
            deviceMap[token.deviceId].tokens.push(token);
          }
          // Also check multi-device list
          if (token.devices) {
            Object.keys(token.devices).forEach(dId => {
              if (!deviceMap[dId]) {
                deviceMap[dId] = { deviceId: dId, tokens: [], activityCount: 0, lastSeen: 0 };
              }
              if (!deviceMap[dId].tokens.find(t => t.token === token.token)) {
                deviceMap[dId].tokens.push(token);
              }
            });
          }
        });

        // 3. Attach log info to devices
        logsList.forEach(log => {
          if (log.deviceId && deviceMap[log.deviceId]) {
            deviceMap[log.deviceId].activityCount++;
            if (log.timestamp > deviceMap[log.deviceId].lastSeen) {
              deviceMap[log.deviceId].lastSeen = log.timestamp;
            }
          }
        });

        setDevices(Object.values(deviceMap).sort((a, b) => b.lastSeen - a.lastSeen));
        setLoading(false);
      });

      return () => unsubTokens();
    });

    const unsubBanned = onValue(ref(database, 'banned_devices'), (snapshot) => {
      setBannedDevices(snapshot.val() || {});
    });

    return () => { unsubLogs(); unsubBanned(); };
  }, []);

  const banDevice = (deviceId) => {
    const reason = window.prompt("Alasan Ban Perangkat:", "Pelanggaran Syarat & Ketentuan");
    if (reason === null) return;

    set(ref(database, 'banned_devices/' + deviceId.replace(/[.#$[\]]/g, '_')), {
      deviceId,
      bannedAt: Date.now(),
      reason: reason || 'Banned by admin'
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

  const deviceLogs = selectedDevice
    ? logs.filter(l => l.deviceId === selectedDevice.deviceId).slice(0, 50)
    : [];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2><Users className="inline-icon" /> User & Device Management</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Pantau aktivitas dan kelola akses perangkat pengguna
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Cari Device ID Pengguna..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Memuat data pengguna...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {search ? 'Device tidak ditemukan.' : 'Belum ada device yang terdaftar.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1rem' }}>
          {filtered.map(device => {
            const isBanned = !!bannedDevices[device.deviceId.replace(/[.#$[\]]/g, '_')];
            const activeTokens = device.tokens.filter(t => t.isActive && t.expiresAt > Date.now());

            return (
              <div key={device.deviceId} className="card" style={{
                borderTop: `4px solid ${isBanned ? '#ef4444' : '#10b981'}`,
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                      <Activity size={20} color={isBanned ? '#ef4444' : '#10b981'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, wordBreak: 'break-all', maxWidth: '200px' }}>{device.deviceId}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Clock size={10} />
                        {device.lastSeen ? `Terakhir aktif: ${new Date(device.lastSeen).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}` : 'Belum ada aktivitas'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-outline" onClick={() => setSelectedDevice(device)} style={{ padding: '6px 10px', fontSize: 12 }}>
                      <ListFilter size={14} /> Logs
                    </button>
                    {isBanned ? (
                      <button className="btn btn-outline" onClick={() => unbanDevice(device.deviceId)}
                        style={{ fontSize: 12, padding: '6px 10px', color: '#10b981', borderColor: '#10b981' }}>
                        Unban
                      </button>
                    ) : (
                      <button className="btn btn-danger" onClick={() => banDevice(device.deviceId)}
                        style={{ fontSize: 12, padding: '6px 10px' }}>
                        Ban
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Token Aktif</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{activeTokens.length} Token</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Total Aktivitas</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{device.activityCount} Log</div>
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Riwayat Token:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {device.tokens.map(t => (
                      <span key={t.token} title={t.type} style={{
                        padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 500,
                        backgroundColor: t.isActive && t.expiresAt > Date.now()
                          ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: t.isActive && t.expiresAt > Date.now() ? '#10b981' : '#ef4444',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        {t.token}
                      </span>
                    ))}
                  </div>
                </div>

                {isBanned && bannedDevices[device.deviceId.replace(/[.#$[\]]/g, '_')]?.reason && (
                  <div style={{
                    marginTop: '1rem', padding: '0.75rem',
                    backgroundColor: 'rgba(239,68,68,0.1)', border: '1px dashed #ef4444', borderRadius: 8,
                    fontSize: 12, color: '#ef4444'
                  }}>
                    <strong>Alasan Ban:</strong> {bannedDevices[device.deviceId.replace(/[.#$[\]]/g, '_')].reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Activity Modal */}
      {selectedDevice && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '85vh', padding: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Aktivitas Perangkat</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{selectedDevice.deviceId}</p>
              </div>
              <button onClick={() => setSelectedDevice(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
              {deviceLogs.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Tidak ada data aktivitas tercatat.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {deviceLogs.map((log, idx) => (
                    <div key={idx} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--primary-color)' }}>{log.type.toUpperCase()}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{new Date(log.timestamp).toLocaleString('id-ID')}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{log.message}</div>
                      {log.detail && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: 4 }}>{log.detail}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
              <button className="btn btn-outline" onClick={() => setSelectedDevice(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;

