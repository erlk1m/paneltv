import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { database } from '../firebase';
import { Plus, Edit2, Trash2, X, FolderOpen, Tag, Folder, RefreshCw, ChevronRight } from 'lucide-react';

const DEFAULT_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#64748b'
];

const EMOJI_MAP = {
  'nasional': '🇮🇩', 'indonesia': '🇮🇩',
  'news': '📰', 'berita': '📰',
  'sport': '⚽', 'olahraga': '⚽',
  'kid': '🧸', 'anak': '🧸',
  'movie': '🍿', 'film': '🍿', 'cinema': '🍿',
  'entertainment': '🎬', 'hiburan': '🎬',
  'music': '🎵', 'musik': '🎵',
  'religi': '🕌', 'islam': '🕌',
  'knowledge': '📚', 'edukasi': '📚',
  'local': '📍', 'lokal': '📍',
};

const getIcon = (name) => {
  const lower = (name || '').toLowerCase();
  for (const [key, icon] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return '📺';
};

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [channelCategories, setChannelCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [parentCat, setParentCat] = useState(null);
  const [selectedSubCats, setSelectedSubCats] = useState([]);

  const [formData, setFormData] = useState({
    name: '', icon: '📺', colorHex: '#3b82f6', isPlaylist: false, playlistUrl: ''
  });

  useEffect(() => {
    onValue(ref(database, 'categories'), (snapshot) => {
      const data = snapshot.val() || {};
      setCategories(Object.entries(data).map(([k, v]) => ({
        id: k, ...v,
        subs: v.subCategories ? Object.values(v.subCategories) : []
      })));
      setLoading(false);
    });

    onValue(ref(database, 'channels'), (snapshot) => {
      const data = snapshot.val() || {};
      const cats = [...new Set(Object.values(data).map(ch => ch.category).filter(Boolean))].sort();
      setChannelCategories(cats);
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = { ...formData, isPlaylist: formData.isPlaylist || !!formData.playlistUrl };
      if (editingId) {
        await update(ref(database, `categories/${editingId}`), dataToSave);
      } else {
        const newRef = push(ref(database, 'categories'));
        await set(newRef, { ...dataToSave, id: newRef.key, channelCount: 0 });
      }
      setShowModal(false);
    } catch (err) { alert(err.message); }
  };

  const deleteCategory = async (id) => {
    if (window.confirm("Hapus folder/kategori ini?")) {
      await remove(ref(database, `categories/${id}`));
    }
  };

  const handleSaveSubs = async () => {
    try {
      const subCatsObj = {};
      selectedSubCats.forEach(name => {
        const key = name.replace(/[.#$[\]/]/g, '_');
        subCatsObj[key] = { id: name, name, icon: getIcon(name) };
      });
      await set(ref(database, `categories/${parentCat.id}/subCategories`), subCatsObj);
      await update(ref(database, `categories/${parentCat.id}`), { isPlaylist: selectedSubCats.length > 0 });
      setShowSubModal(false);
    } catch (err) { alert(err.message); }
  };

  const syncCategory = async (cat) => {
    if (!cat.playlistUrl) return;
    if (!window.confirm(`Sync M3U untuk folder "${cat.name}"? Channel lama dari playlist ini akan diganti.`)) return;
    
    setIsSyncing(true);
    try {
      const url = cat.playlistUrl + (cat.playlistUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
      const res = await fetch(url, { cache: 'no-store' });
      const text = await res.text();
      const lines = text.split('\n');

      const channelsSnap = await new Promise(resolve => onValue(ref(database, 'channels'), resolve, { onlyOnce: true }));
      const allChannels = channelsSnap.val() || {};
      const updates = {};
      
      Object.keys(allChannels).forEach(key => {
        // Hapus jika playlistSource sama, ATAU category nya sama (untuk kompatibilitas lama)
        if (allChannels[key].playlistSource === cat.id || allChannels[key].category === cat.name) {
          updates[`channels/${key}`] = null;
        }
      });

      let currentCh = {};
      let count = 0;
      const foundGroups = new Set();

      for (let line of lines) {
        line = line.trim();
        if (line.startsWith('#EXTINF:')) {
          const name = line.split(',').pop();
          const logo = line.match(/tvg-logo="([^"]+)"/)?.[1] || '';
          const group = line.match(/group-title="([^"]+)"/)?.[1] || cat.name;
          foundGroups.add(group);
          
          currentCh = { 
            name, 
            category: group, 
            playlistSource: cat.id, // Penanda bahwa channel ini milik M3U ini
            logoUrl: logo, 
            status: 'ACTIVE', 
            streamType: 'HLS', 
            drmType: 'NONE' 
          };
        } else if (line.startsWith('http')) {
          currentCh.streamUrl = line;
          if (line.includes('.mpd')) currentCh.streamType = 'DASH';
          
          const newKey = push(ref(database, 'channels')).key;
          updates[`channels/${newKey}`] = { ...currentCh, id: newKey };
          count++;
        }
      }

      // Update sub-categories folder ini secara otomatis
      const subCatsObj = {};
      foundGroups.forEach(groupName => {
        const key = groupName.replace(/[.#$[\]/]/g, '_');
        subCatsObj[key] = { id: groupName, name: groupName, icon: getIcon(groupName) };
      });
      updates[`categories/${cat.id}/subCategories`] = subCatsObj;
      updates[`categories/${cat.id}/isPlaylist`] = true;

      await update(ref(database), updates);
      alert(`Success! Disinkronisasi ${count} channels. ${foundGroups.size} sub-kategori ditambahkan ke folder ${cat.name}.`);
    } catch (e) {
      alert("Sync failed: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const autoGenerate = async () => {
    if (!window.confirm("Otomatis buat folder untuk semua kategori unik yang terdeteksi?")) return;
    setIsSyncing(true);
    try {
        const updates = {};
        channelCategories.forEach(name => {
            const key = name.replace(/[.#$[\]/]/g, '_');
            updates[`categories/${key}`] = {
                id: key, name, icon: getIcon(name), colorHex: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
                isPlaylist: false, channelCount: 0
            };
        });
        await update(ref(database), updates);
        alert("Folders generated successfully!");
    } catch (e) { alert(e.message); }
    finally { setIsSyncing(false); }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading categories...</div>;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2><FolderOpen className="inline-icon" /> Category & Folders</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Kelola folder playlist dan kategori channel</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={autoGenerate} disabled={isSyncing}>
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> Auto Generate
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingId(null); setFormData({name:'', icon:'📺', colorHex:'#3b82f6', isPlaylist:false, playlistUrl: ''}); setShowModal(true); }}>
            <Plus size={16} /> Tambah Folder
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
        {categories.map(cat => (
          <div key={cat.id} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: cat.colorHex, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  {cat.icon}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {cat.name} 
                    {cat.isPlaylist && <Tag size={12} color="var(--primary-color)" />}
                    {cat.playlistUrl && <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--primary-color)', color: '#fff', borderRadius: 4 }}>M3U</span>}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {cat.isPlaylist ? `${cat.subs.length} Kategori` : `${cat.channelCount || 0} Channel`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {cat.playlistUrl && (
                  <button className="btn-outline" style={{ padding: 6, color: '#10b981' }} onClick={() => syncCategory(cat)} title="Sync M3U ke Firebase" disabled={isSyncing}>
                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                  </button>
                )}
                <button className="btn-outline" style={{ padding: 6 }} onClick={() => { setEditingId(cat.id); setFormData(cat); setShowModal(true); }}><Edit2 size={14} /></button>
                <button className="btn-outline" style={{ padding: 6, color: '#ef4444' }} onClick={() => deleteCategory(cat.id)}><Trash2 size={14} /></button>
              </div>
            </div>

            {cat.isPlaylist && (
              <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                   <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>SUB-CATEGORIES ({cat.subs.length})</span>
                   <button onClick={() => { setParentCat(cat); setSelectedSubCats(cat.subs.map(s => s.id)); setShowSubModal(true); }} style={{ fontSize: 11, color: 'var(--primary-color)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Manage Items</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {cat.subs.length === 0 ? (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>No items yet. Click manage to add.</span>
                  ) : (
                    cat.subs.map(s => <span key={s.id} style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>{s.icon} {s.name}</span>)
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Add/Edit Folder */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 700 }}>{editingId ? 'Edit Folder' : 'Tambah Folder'}</h3>
              <X onClick={() => setShowModal(false)} style={{ cursor: 'pointer' }} />
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nama Folder</label>
                <input className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Icon (Emoji)</label>
                <input className="form-input" value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Warna</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DEFAULT_COLORS.map(c => (
                    <div key={c} onClick={() => setFormData({...formData, colorHex: c})} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: formData.colorHex === c ? '3px solid white' : 'none', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Playlist URL (M3U)</label>
                <input className="form-input" value={formData.playlistUrl || ''} onChange={e => setFormData({...formData, playlistUrl: e.target.value})} placeholder="https://.../playlist.m3u8" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'rgba(59,130,246,0.1)', borderRadius: 8 }}>
                <input type="checkbox" checked={formData.isPlaylist || !!formData.playlistUrl} onChange={e => setFormData({...formData, isPlaylist: e.target.checked})} style={{ width: 18, height: 18 }} />
                <label style={{ fontSize: 13, fontWeight: 600 }}>Mode Playlist (Dapat diisi kategori lain atau dari URL)</label>
              </div>
              <button type="submit" className="btn btn-primary">Simpan</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Manage Subs */}
      {showSubModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '450px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 700 }}>Isi Folder: {parentCat.name}</h3>
              <X onClick={() => setShowSubModal(false)} style={{ cursor: 'pointer' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
               {channelCategories.map(name => {
                 const active = selectedSubCats.includes(name);
                 return (
                   <div key={name} onClick={() => setSelectedSubCats(active ? selectedSubCats.filter(n => n !== name) : [...selectedSubCats, name])}
                     style={{ padding: '0.75rem', borderRadius: 8, background: active ? 'rgba(59,130,246,0.15)' : 'transparent', border: `1px solid ${active ? 'var(--primary-color)' : 'var(--border-color)'}`, marginBottom: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                     <div style={{ width: 18, height: 18, borderRadius: 4, border: '2px solid var(--primary-color)', background: active ? 'var(--primary-color)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       {active && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                     </div>
                     <span>{getIcon(name)} {name}</span>
                   </div>
                 );
               })}
            </div>
            <button onClick={handleSaveSubs} className="btn btn-primary" style={{ marginTop: '1rem' }}>Simpan Perubahan</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
