import React, { useState, useEffect } from 'react';
import { ref, onValue, set, update, remove } from 'firebase/database';
import { database } from '../firebase';
import { Key, Plus, Trash2, ShieldAlert, CheckCircle } from 'lucide-react';

const Tokens = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [durationDays, setDurationDays] = useState(30);
  const [customToken, setCustomToken] = useState('');

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
      deviceId: null
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

  const deleteToken = (tokenId) => {
    if (window.confirm("Are you sure you want to permanently delete this token?")) {
      remove(ref(database, 'access_tokens/' + tokenId))
        .catch(e => alert("Error deleting token: " + e.message));
    }
  };

  const isLifetime = (expiresAt) => expiresAt > Date.now() + (50 * 365 * 24 * 60 * 60 * 1000);

  return (
    <div className="page-container">
      {/* Page Title */}
      <div className="page-header">
        <h2><Key className="inline-icon" /> Token Management</h2>
      </div>

      {/* Generate Token Form Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>Generate New Token</h3>
        <div className="token-form">
          <input
            type="text"
            className="form-input"
            placeholder="Custom Token (Opsional)"
            value={customToken}
            onChange={(e) => setCustomToken(e.target.value.toUpperCase())}
          />
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
          <button onClick={generateToken} className="btn btn-primary">
            <Plus size={18} /> Generate VIP Token
          </button>
        </div>
      </div>

      {/* Token List */}
      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading tokens...</div>
        ) : tokens.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No tokens generated yet.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="token-table-wrapper">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 16px' }}>Token</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Expires At</th>
                    <th style={{ padding: '12px 16px' }}>Device ID</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token) => (
                    <tr key={token.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{token.token}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
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
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {token.deviceId || <em>Unused</em>}
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
                        <button
                          onClick={() => toggleTokenStatus(token)}
                          className="btn btn-outline"
                          style={{ marginRight: '8px', padding: '6px 12px', fontSize: '13px' }}
                        >
                          {token.isActive ? 'Revoke' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteToken(token.id)}
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="token-card-list">
              {tokens.map((token) => (
                <div key={token.id} className="token-card-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '15px', wordBreak: 'break-all' }}>{token.token}</span>
                    <span style={{
                      marginLeft: '8px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      flexShrink: 0,
                      backgroundColor: token.type === 'PREMIUM' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      color: token.type === 'PREMIUM' ? '#eab308' : '#3b82f6'
                    }}>
                      {token.type}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Expires: {isLifetime(token.expiresAt)
                      ? <span style={{ color: '#10b981', fontWeight: 'bold' }}>Lifetime ♾️</span>
                      : new Date(token.expiresAt).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Device: {token.deviceId || <em>Unused</em>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px',
                      color: token.isActive ? '#10b981' : '#ef4444'
                    }}>
                      {token.isActive ? <><CheckCircle size={14} /> Active</> : <><ShieldAlert size={14} /> Revoked</>}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => toggleTokenStatus(token)}
                        className="btn btn-outline"
                        style={{ padding: '6px 14px', fontSize: '13px' }}
                      >
                        {token.isActive ? 'Revoke' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteToken(token.id)}
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Tokens;
