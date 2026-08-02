import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { database } from '../firebase';
import { Plus, Edit2, Trash2, X, Download, Link, AlertTriangle, Search, Filter, RefreshCw, Layers } from 'lucide-react';

const Channels = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [importProgress, setImportProgress] = useState('');

  // UI State
  const [showModal, setShowModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', category: '', streamUrl: '', streamType: 'HLS',
    drmType: 'NONE', licenseServer: '', logoUrl: '', status: 'ACTIVE',
    userAgent: '', referer: '',
    isAdult: false, viewerCount: 0
  });

  useEffect(() => {
    const unsub = onValue(ref(database, 'channels'), (snapshot) => {
      const data = snapshot.val() || {};
      setChannels(Object.entries(data).map(([k, v]) => ({ id: k, ...v })));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Filters
  const categories = useMemo(() => ['All', ...new Set(channels.map(c => c.category).filter(Boolean))].sort(), [channels]);
  const filteredChannels = useMemo(() => {
    return channels.filter(ch => {
      const matchesSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           ch.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter === 'All' || ch.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [channels, searchQuery, categoryFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await update(ref(database, `channels/${editingId}`), formData);
      } else {
        const newRef = push(ref(database, 'channels'));
        await set(newRef, { ...formData, id: newRef.key });
      }
      setShowModal(false);
    } catch (err) { alert(err.message); }
  };

  const deleteChannel = async (id) => {
    if (window.confirm("Hapus channel ini?")) {
      await remove(ref(database, `channels/${id}`));
    }
  };

  const deleteAllChannels = async () => {
    if (window.confirm("PERINGATAN: Anda yakin ingin menghapus SEMUA channel? Tindakan ini tidak bisa dibatalkan.")) {
      try {
        await remove(ref(database, 'channels'));
        alert("Semua channel berhasil dihapus.");
      } catch (err) {
        alert("Gagal menghapus: " + err.message);
      }
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2><Layers className="inline-icon" /> Live Events / Custom Channels</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Total {channels.length} channel manual di database</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }} onClick={deleteAllChannels}>
            <Trash2 size={16} /> Hapus Semua
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingId(null); setShowModal(true); }}>
            <Plus size={16} /> Tambah Channel
          </button>
        </div>
      </div>



      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="Cari nama channel atau kategori..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: '200px' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Channel Table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)' }}>CHANNEL</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)' }}>CATEGORY</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)' }}>TYPE</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: 13, color: 'var(--text-secondary)' }}>STATUS</th>
              <th style={{ padding: '1rem', textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredChannels.map(ch => (
              <tr key={ch.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, background: 'white', borderRadius: 6, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={ch.logoUrl || '/icons.svg'} style={{ maxWidth: '100%', maxHeight: '100%' }} onError={e => e.target.src='/icons.svg'} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{ch.name}</span>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}><span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, fontSize: 12 }}>{ch.category}</span></td>
                <td style={{ padding: '1rem', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{ch.streamType} {ch.drmType !== 'NONE' && '🔒'}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: ch.status === 'ACTIVE' ? '#10b98122' : '#ef444422', color: ch.status === 'ACTIVE' ? '#10b981' : '#ef4444' }}>
                    ● {ch.status}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button className="btn-outline" style={{ padding: '6px' }} onClick={() => { setEditingId(ch.id); setFormData(ch); setShowModal(true); }}><Edit2 size={14} /></button>
                    <button className="btn-outline" style={{ padding: '6px', color: '#ef4444' }} onClick={() => deleteChannel(ch.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredChannels.length === 0 && (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No channels found.</div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 700 }}>{editingId ? 'Edit Channel' : 'Tambah Channel'}</h3>
              <X onClick={() => setShowModal(false)} style={{ cursor: 'pointer' }} />
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nama Channel</label>
                <input className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <input className="form-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Logo URL (Opsional)</label>
                  <input className="form-input" value={formData.logoUrl || ''} onChange={e => setFormData({...formData, logoUrl: e.target.value})} placeholder="https://..." />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Stream URL</label>
                <input className="form-input" value={formData.streamUrl} onChange={e => setFormData({...formData, streamUrl: e.target.value})} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Stream Type</label>
                  <select className="form-input" value={formData.streamType} onChange={e => setFormData({...formData, streamType: e.target.value})}>
                    <option value="HLS">HLS</option>
                    <option value="DASH">DASH</option>
                    <option value="PROGRESSIVE">MP4</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="ACTIVE">Active</option>
                    <option value="OFFLINE">Offline</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">DRM Type</label>
                  <select className="form-input" value={formData.drmType} onChange={e => setFormData({...formData, drmType: e.target.value})}>
                    <option value="NONE">None</option>
                    <option value="CLEARKEY">ClearKey</option>
                    <option value="WIDEVINE">Widevine</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">License Key/URL</label>
                  <input className="form-input" value={formData.licenseServer || ''} onChange={e => setFormData({...formData, licenseServer: e.target.value})} placeholder="hex:hex atau url" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">User-Agent (Opsional)</label>
                <input className="form-input" value={formData.userAgent || ''} onChange={e => setFormData({...formData, userAgent: e.target.value})} placeholder="Custom User-Agent" />
              </div>
              <div className="form-group">
                <label className="form-label">Referer (Opsional)</label>
                <input className="form-input" value={formData.referer || ''} onChange={e => setFormData({...formData, referer: e.target.value})} placeholder="Custom Referer" />
              </div>
              <button type="submit" className="btn btn-primary">Simpan</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Channels;
