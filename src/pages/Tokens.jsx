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
    
    // Validasi token gak boleh mengandung karakter invalid Firebase (seperti titik, #, $, [, atau ])
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
        setCustomToken(''); // reset
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

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2><Key className="inline-icon" /> Token Management</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Custom Token (Opsional)" 
            value={customToken}
            onChange={(e) => setCustomToken(e.target.value.toUpperCase())}
            style={{ width: '180px' }}
          />
          <select 
            className="form-input" 
            style={{ width: 'auto' }}
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
          <button onClick={generateToken} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Plus size={18} /> Generate VIP Token
          </button>
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
          <div style={{ overflowX: 'auto' }}>
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
                      {token.expiresAt > Date.now() + (50 * 365 * 24 * 60 * 60 * 1000) 
                        ? <span style={{fontWeight: 'bold', color: '#10b981'}}>Lifetime ♾️</span> 
                        : new Date(token.expiresAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {token.deviceId ? (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{token.deviceId}</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>Unused</span>
                      )}
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
        )}
      </div>
    </div>
  );
};

export default Tokens;
