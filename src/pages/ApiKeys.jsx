import React, { useState, useEffect } from 'react';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { database } from '../firebase';
import { Code2, Plus, Trash2, ShieldAlert, ShieldCheck, Copy } from 'lucide-react';

const generateKey = () => 'ek_live_' + Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('');

const ApiKeys = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ label: '', rateLimit: 100 });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const unsubscribe = onValue(ref(database, 'api_keys'), (snapshot) => {
      const data = snapshot.val() || {};
      setKeys(Object.entries(data).map(([k, v]) => ({ id: k, ...v })).sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const createKey = () => {
    if (!form.label.trim()) return alert('Label API key harus diisi!');
    const newKey = generateKey();
    set(ref(database, 'api_keys/' + newKey), {
      key: newKey,
      label: form.label,
      rateLimit: form.rateLimit,
      isActive: true,
      createdAt: Date.now(),
      usageCount: 0
    }).then(() => {
      alert(`✅ API Key berhasil dibuat!\n\n${newKey}\n\nSimpan key ini, tidak akan ditampilkan lagi secara penuh.`);
      setForm({ label: '', rateLimit: 100 });
      setShowForm(false);
    }).catch(e => alert('Error: ' + e.message));
  };

  const toggleKey = (key) => {
    set(ref(database, 'api_keys/' + key.id + '/isActive'), !key.isActive).catch(e => alert(e.message));
  };

  const deleteKey = (id) => {
    if (!window.confirm('Hapus API Key ini? Semua sistem yang menggunakan key ini akan berhenti berfungsi.')) return;
    remove(ref(database, 'api_keys/' + id)).catch(e => alert(e.message));
  };

  const copyKey = (key) => {
    navigator.clipboard.writeText(key).then(() => alert('API Key disalin!'));
  };

  const maskKey = (key) => key.substring(0, 12) + '••••••••••••••••' + key.slice(-4);

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2><Code2 className="inline-icon" /> API Management</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Generate dan kelola API key dengan rate limiting</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ fontSize: 13 }}>
          <Plus size={16} /> Generate API Key
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary-color)' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Generate API Key Baru</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Label (Nama Penggunaan)</label>
              <input className="form-input" placeholder="Contoh: Mobile App v2" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Rate Limit (req/jam)</label>
              <input className="form-input" type="number" min="1" value={form.rateLimit} onChange={e => setForm({ ...form, rateLimit: Number(e.target.value) })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={createKey} style={{ fontSize: 13 }}><Plus size={15} /> Generate</button>
            <button className="btn btn-outline" onClick={() => setShowForm(false)} style={{ fontSize: 13 }}>Batal</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Loading API keys...</div>
      ) : keys.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Belum ada API key. Klik "Generate API Key" untuk membuat.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {keys.map(key => (
            <div key={key.id} className="card" style={{ borderLeft: `4px solid ${key.isActive ? 'var(--primary-color)' : 'var(--border-color)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{key.label}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11,
                      backgroundColor: key.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: key.isActive ? '#10b981' : '#ef4444'
                    }}>
                      {key.isActive ? 'Active' : 'Revoked'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: '0.4rem 0.75rem',
                    fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all'
                  }}>
                    <span style={{ flex: 1 }}>{maskKey(key.key)}</span>
                    <button onClick={() => copyKey(key.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}>
                      <Copy size={14} />
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span>⚡ Rate limit: {key.rateLimit} req/jam</span>
                    <span>📊 Total penggunaan: {key.usageCount || 0}</span>
                    <span>📅 Dibuat: {new Date(key.createdAt).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    className={`btn ${key.isActive ? 'btn-outline' : 'btn-primary'}`}
                    onClick={() => toggleKey(key)}
                    style={{ padding: '6px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    {key.isActive ? <><ShieldAlert size={13} /> Revoke</> : <><ShieldCheck size={13} /> Aktifkan</>}
                  </button>
                  <button className="btn btn-danger" onClick={() => deleteKey(key.id)} style={{ padding: '6px 10px' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApiKeys;
