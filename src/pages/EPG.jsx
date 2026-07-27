import React, { useState, useEffect } from 'react';
import { ref, onValue, set, remove, push, update } from 'firebase/database';
import { database } from '../firebase';
import { BookOpen, Plus, Trash2, Link2, CheckCircle, XCircle } from 'lucide-react';

const EPG = () => {
  const [sources, setSources] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', url: '' });
  const [showForm, setShowForm] = useState(false);
  const [mappingChannel, setMappingChannel] = useState(null);
  const [epgId, setEpgId] = useState('');

  useEffect(() => {
    const unsubEpg = onValue(ref(database, 'epg_sources'), (s) => {
      const d = s.val() || {};
      setSources(Object.entries(d).map(([k, v]) => ({ id: k, ...v })));
      setLoading(false);
    });
    const unsubCh = onValue(ref(database, 'channels'), (s) => {
      const d = s.val() || {};
      setChannels(Object.entries(d).map(([k, v]) => ({ id: k, ...v })));
    });
    return () => { unsubEpg(); unsubCh(); };
  }, []);

  const addSource = () => {
    if (!form.name.trim() || !form.url.trim()) return alert('Nama dan URL harus diisi!');
    push(ref(database, 'epg_sources'), { ...form, isActive: true, createdAt: Date.now() })
      .then(() => { setForm({ name: '', url: '' }); setShowForm(false); })
      .catch(e => alert('Error: ' + e.message));
  };

  const toggleSource = (id, current) => {
    update(ref(database, 'epg_sources/' + id), { isActive: !current }).catch(e => alert(e.message));
  };

  const deleteSource = (id) => {
    if (!window.confirm('Hapus EPG source ini?')) return;
    remove(ref(database, 'epg_sources/' + id)).catch(e => alert(e.message));
  };

  const saveMapping = () => {
    if (!mappingChannel) return;
    update(ref(database, 'channels/' + mappingChannel.id), { epgId: epgId.trim() })
      .then(() => { setMappingChannel(null); setEpgId(''); alert('EPG mapping disimpan!'); })
      .catch(e => alert(e.message));
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2><BookOpen className="inline-icon" /> EPG Management</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Kelola EPG (Electronic Program Guide) source dan mapping ke channel</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ fontSize: 13 }}>
          <Plus size={16} /> Tambah EPG Source
        </button>
      </div>

      {/* Add Source Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary-color)' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Tambah EPG Source</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nama</label>
              <input className="form-input" placeholder="Indonesia EPG" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">URL XMLTV</label>
              <input className="form-input" placeholder="https://example.com/epg.xml" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={addSource} style={{ fontSize: 13 }}><Plus size={15} /> Simpan</button>
            <button className="btn btn-outline" onClick={() => setShowForm(false)} style={{ fontSize: 13 }}>Batal</button>
          </div>
        </div>
      )}

      {/* EPG Source List */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>EPG Sources</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '1rem' }}>Loading...</div>
        ) : sources.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>Belum ada EPG source.</div>
        ) : (
          sources.map(src => (
            <div key={src.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{src.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Link2 size={11} /> {src.url}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  className={`btn ${src.isActive ? 'btn-outline' : 'btn-primary'}`}
                  onClick={() => toggleSource(src.id, src.isActive)}
                  style={{ padding: '5px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  {src.isActive ? <><XCircle size={13} /> Nonaktifkan</> : <><CheckCircle size={13} /> Aktifkan</>}
                </button>
                <button className="btn btn-danger" onClick={() => deleteSource(src.id)} style={{ padding: '5px 8px' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Channel EPG Mapping */}
      <div className="card">
        <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>EPG Mapping ke Channel</h3>
        {channels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>Belum ada channel.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '10px 12px' }}>Channel</th>
                  <th style={{ padding: '10px 12px' }}>EPG ID</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {channels.slice(0, 20).map(ch => (
                  <tr key={ch.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{ch.name}</td>
                    <td style={{ padding: '10px 12px', color: ch.epgId ? 'var(--text-primary)' : 'var(--text-secondary)', fontStyle: ch.epgId ? 'normal' : 'italic' }}>
                      {ch.epgId || 'Belum di-set'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button className="btn btn-outline" onClick={() => { setMappingChannel(ch); setEpgId(ch.epgId || ''); }} style={{ padding: '4px 12px', fontSize: 12 }}>
                        Set EPG ID
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {channels.length > 20 && <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--text-secondary)', fontSize: 13 }}>...dan {channels.length - 20} channel lainnya</div>}
          </div>
        )}
      </div>

      {/* Mapping Modal */}
      {mappingChannel && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 400 }}>
            <h3 style={{ marginBottom: '1rem' }}>Set EPG ID — {mappingChannel.name}</h3>
            <div className="form-group">
              <label className="form-label">EPG Channel ID</label>
              <input className="form-input" placeholder="contoh: TVONE.id" value={epgId} onChange={e => setEpgId(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn btn-primary" onClick={saveMapping} style={{ flex: 1 }}>Simpan</button>
              <button className="btn btn-outline" onClick={() => { setMappingChannel(null); setEpgId(''); }}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EPG;
