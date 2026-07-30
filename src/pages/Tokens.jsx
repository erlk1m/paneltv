import React, { useState, useEffect } from 'react';
import { ref, onValue, set, update, remove } from 'firebase/database';
import { database } from '../firebase';
import { Key, Plus, Trash2, ShieldAlert, CheckCircle, Edit, X, Smartphone, RefreshCw } from 'lucide-react';

const Tokens = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [durationDays, setDurationDays] = useState(30);
  const [maxDevices, setMaxDevices] = useState(1);
  const [customToken, setCustomToken] = useState('');
  const [editModalData, setEditModalData] = useState(null);

  const openEditModal = (token) => {
    setEditModalData({
      originalToken: token.token,
      token: token.token,
      type: token.type,
      maxDevices: token.maxDevices || 1,
      devices: token.devices || {},
      expiresAt: token.expiresAt,
      isActive: token.isActive,
      addDays: 0
    });
  };

  const saveEdit = () => {
    let finalToken = editModalData.token.trim();
    if (!finalToken) return alert("Token tidak boleh kosong");
    if (/[.#$\[\]]/.test(finalToken)) return alert("Token tidak boleh mengandung . # $ [ atau ]");

    let newExpiresAt = editModalData.expiresAt;
    if (editModalData.addDays > 0) {
      const baseTime = (newExpiresAt < Date.now()) ? Date.now() : newExpiresAt;
      newExpiresAt = baseTime + (editModalData.addDays * 24 * 60 * 60 * 1000);
    }

    const tokenObj = {
      token: finalToken,
      type: editModalData.type,
      maxDevices: editModalData.maxDevices,
      devices: editModalData.devices,
      expiresAt: newExpiresAt,
      isActive: editModalData.isActive
    };

    if (finalToken !== editModalData.originalToken) {
      remove(ref(database, 'access_tokens/' + editModalData.originalToken))
        .then(() => set(ref(database, 'access_tokens/' + finalToken), tokenObj))
        .then(() => {
          setEditModalData(null);
        })
        .catch(e => alert('Error: ' + e.message));
    } else {
      update(ref(database, 'access_tokens/' + finalToken), tokenObj)
        .then(() => {
          setEditModalData(null);
        })
        .catch(e => alert('Error: ' + e.message));
    }
  };

  useEffect(() => {
    const tokensRef = ref(database, 'access_tokens');
    const unsubscribe = onValue(tokensRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tokensList = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        setTokens(tokensList.sort((a, b) => b.expiresAt - a.expiresAt));
      } else {
        setTokens([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const generateToken = () => {
    let finalToken = customToken.trim();
    if (!finalToken) {
      finalToken = "VIP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    if (/[.#$\[\]]/.test(finalToken)) {
      alert("Token tidak boleh mengandung karakter . # $ [ atau ]");
      return;
    }

    const expiresAt = Date.now() + (durationDays * 24 * 60 * 60 * 1000);

    const newToken = {
      token: finalToken,
      type: 'PREMIUM',
      expiresAt: expiresAt,
      isActive: true,
      maxDevices: maxDevices,
      devices: {}
    };

    set(ref(database, 'access_tokens/' + finalToken), newToken)
      .then(() => {
        alert(`Token generated: ${finalToken}`);
        setCustomToken('');
      })
      .catch((error) => alert('Failed to generate token: ' + error.message));
  };

  const toggleTokenStatus = (token) => {
    update(ref(database, 'access_tokens/' + token.token), {
      isActive: !token.isActive
    }).catch(e => alert("Error updating token: " + e.message));
  };

  const resetDevices = (token) => {
    if (window.confirm("Reset all registered devices for this token?")) {
      update(ref(database, 'access_tokens/' + token.token), {
        devices: {}
      }).catch(e => alert("Error resetting devices: " + e.message));
    }
  };

  const deleteToken = (tokenId) => {
    if (window.confirm("Are you sure you want to permanently delete this token?")) {
      remove(ref(database, 'access_tokens/' + tokenId))
        .catch(e => alert("Error deleting token: " + e.message));
    }
  };

  const isLifetime = (expiresAt) => expiresAt > Date.now() + (50 * 365 * 24 * 60 * 60 * 1000);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2><Key className="inline-icon" /> Token Management</h2>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>Generate New Token</h3>
        <div className="token-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Custom Token</label>
            <input
              type="text"
              className="form-input"
              placeholder="VIP-XXXXXXXX"
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value.toUpperCase())}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Duration</label>
            <select
              className="form-input"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
            >
              <option value={1}>1 Day</option>
              <option value={7}>7 Days</option>
              <option value={30}>1 Month (30 Days)</option>
              <option value={90}>3 Months (90 Days)</option>
              <option value={365}>1 Year (365 Days)</option>
              <option value={36500}>Lifetime (100 Years)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Max Devices</label>
            <select
              className="form-input"
              value={maxDevices}
              onChange={(e) => setMaxDevices(Number(e.target.value))}
            >
              <option value={1}>1 Device</option>
              <option value={2}>2 Devices</option>
              <option value={3}>3 Devices</option>
              <option value={5}>5 Devices</option>
              <option value={10}>10 Devices</option>
              <option value={100}>Unlimited (100)</option>
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={generateToken} className="btn btn-primary" style={{ width: '100%' }}>
              <Plus size={18} /> Generate VIP
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading tokens...</div>
        ) : tokens.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No tokens generated yet.
          </div>
        ) : (
          <>
            <div className="token-table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 16px' }}>Token</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Expires At</th>
                    <th style={{ padding: '12px 16px' }}>Devices</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token) => {
                    const deviceCount = token.devices ? Object.keys(token.devices).length : 0;
                    const maxAllowed = token.maxDevices || 1;

                    return (
                      <tr key={token.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{token.token}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                            backgroundColor: token.type === 'PREMIUM' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            color: token.type === 'PREMIUM' ? '#eab308' : '#3b82f6'
                          }}>
                            {token.type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {isLifetime(token.expiresAt)
                            ? <span style={{ fontWeight: 'bold', color: '#10b981' }}>Lifetime ♾️</span>
                            : new Date(token.expiresAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Smartphone size={14} className="text-secondary" />
                            <span style={{
                              fontSize: '14px',
                              color: deviceCount >= maxAllowed ? '#ef4444' : 'inherit',
                              fontWeight: deviceCount >= maxAllowed ? 'bold' : 'normal'
                            }}>
                              {deviceCount} / {maxAllowed}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {token.isActive ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '14px' }}>
                              <CheckCircle size={14} /> Active
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '14px' }}>
                              <ShieldAlert size={14} /> Revoked
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button onClick={() => resetDevices(token)} className="btn btn-outline" title="Reset Devices" style={{ marginRight: '8px', padding: '6px' }}>
                            <RefreshCw size={14} />
                          </button>
                          <button onClick={() => openEditModal(token)} className="btn btn-outline" style={{ marginRight: '8px', padding: '6px 12px', fontSize: '13px' }}>
                            <Edit size={14} /> Edit
                          </button>
                          <button onClick={() => deleteToken(token.id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '13px' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="token-card-list">
              {tokens.map((token) => {
                const deviceCount = token.devices ? Object.keys(token.devices).length : 0;
                const maxAllowed = token.maxDevices || 1;
                return (
                  <div key={token.id} className="token-card-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 'bold' }}>{token.token}</span>
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                        backgroundColor: token.type === 'PREMIUM' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: token.type === 'PREMIUM' ? '#eab308' : '#3b82f6'
                      }}>
                        {token.type}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      Expires: {isLifetime(token.expiresAt) ? "Lifetime ♾️" : new Date(token.expiresAt).toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Smartphone size={14} className="text-secondary" />
                          <span style={{ fontSize: '14px', color: deviceCount >= maxAllowed ? '#ef4444' : 'inherit' }}>
                            {deviceCount}/{maxAllowed}
                          </span>
                        </div>
                        {token.isActive ? (
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
                            <CheckCircle size={14}/> Active
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
                            <ShieldAlert size={14}/> Revoked
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => resetDevices(token)} className="btn btn-outline" style={{ padding: '6px' }}><RefreshCw size={14}/></button>
                        <button onClick={() => openEditModal(token)} className="btn btn-outline" style={{ padding: '6px 10px', fontSize: '12px' }}>Edit</button>
                        <button onClick={() => deleteToken(token.id)} className="btn btn-danger" style={{ padding: '6px 10px' }}><Trash2 size={14}/></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {editModalData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', position: 'relative' }}>
            <button onClick={() => setEditModalData(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Edit / Renew Token</h3>
            
            <div className="form-group">
              <label className="form-label">Token Code</label>
              <input className="form-input" value={editModalData.token} onChange={e => setEditModalData({...editModalData, token: e.target.value.toUpperCase()})} />
            </div>
            
            <div className="form-group">
              <label className="form-label">Max Devices</label>
              <select
                className="form-input"
                value={editModalData.maxDevices}
                onChange={e => setEditModalData({...editModalData, maxDevices: Number(e.target.value)})}
              >
                <option value={1}>1 Device</option>
                <option value={2}>2 Devices</option>
                <option value={3}>3 Devices</option>
                <option value={5}>5 Devices</option>
                <option value={10}>10 Devices</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Perpanjang (Renew) +Hari</label>
              <select className="form-input" value={editModalData.addDays} onChange={e => setEditModalData({...editModalData, addDays: Number(e.target.value)})}>
                <option value={0}>Tidak Perpanjang</option>
                <option value={1}>+1 Hari</option>
                <option value={7}>+7 Hari</option>
                <option value={30}>+30 Hari</option>
                <option value={90}>+90 Hari</option>
                <option value={365}>+1 Tahun</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={editModalData.isActive} onChange={e => setEditModalData({...editModalData, isActive: e.target.value === 'true'})}>
                <option value="true">Active</option>
                <option value="false">Revoked</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={saveEdit} className="btn btn-primary" style={{ flex: 1 }}>
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tokens;
