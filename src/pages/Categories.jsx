import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { database } from '../firebase';
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronUp, FolderOpen, Tag, Folder } from 'lucide-react';

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
  const [channelCategories, setChannelCategories] = useState([]); // Categories derived from channels
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [showSubModal, setShowSubModal] = useState(false);
  const [parentCatId, setParentCatId] = useState(null);
  const [parentCatName, setParentCatName] = useState('');
  const [selectedSubCats, setSelectedSubCats] = useState([]); // multi-select
  const [editingSubId, setEditingSubId] = useState(null);
  const [subForm, setSubForm] = useState({ name: '', icon: '📺' });

  const [formData, setFormData] = useState({
    name: '', icon: '📺', colorHex: '#3b82f6', isPlaylist: false,
  });

  // Load Firebase categories
  useEffect(() => {
    const catRef = ref(database, 'categories');
    const unsub = onValue(catRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([key, val]) => ({
          id: key, ...val,
          subCategories: val.subCategories
            ? Object.entries(val.subCategories).map(([sk, sv]) => ({ id: sk, ...sv }))
            : []
        }));
        setCategories(list);
      } else {
        setCategories([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load channel categories (unique group-title values from channels)
  useEffect(() => {
    const channelsRef = ref(database, 'channels');
    const unsub = onValue(channelsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const cats = [...new Set(
          Object.values(data)
            .map(ch => ch.category)
            .filter(Boolean)
        )].sort();
        setChannelCategories(cats);
      } else {
        setChannelCategories([]);
      }
    });
    return () => unsub();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setFormData({ name: '', icon: '📺', colorHex: '#3b82f6', isPlaylist: false });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name || '', icon: cat.icon || '📺', colorHex: cat.colorHex || '#3b82f6', isPlaylist: cat.isPlaylist || false });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await update(ref(database, `categories/${editingId}`), {
          name: formData.name, icon: formData.icon, colorHex: formData.colorHex, isPlaylist: formData.isPlaylist,
        });
      } else {
        const newRef = push(ref(database, 'categories'));
        await set(newRef, { id: newRef.key, name: formData.name, icon: formData.icon, colorHex: formData.colorHex, isPlaylist: formData.isPlaylist, channelCount: 0 });
      }
      setShowModal(false);
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin hapus kategori ini?')) {
      await remove(ref(database, `categories/${id}`));
    }
  };

  // Open modal to add sub-categories (selecting from existing channel categories)
  const openSubModal = (cat) => {
    setParentCatId(cat.id);
    setParentCatName(cat.name);
    // Pre-select already added subs
    setSelectedSubCats(cat.subCategories?.map(s => s.id) || []);
    setShowSubModal(true);
  };

  const toggleSubCat = (catName) => {
    setSelectedSubCats(prev =>
      prev.includes(catName) ? prev.filter(c => c !== catName) : [...prev, catName]
    );
  };

  const handleSaveSubs = async () => {
    try {
      // Build subCategories object from selected channel categories
      const subCatsObj = {};
      selectedSubCats.forEach(catName => {
        // Use the category name as the key (sanitized)
        const key = catName.replace(/[.#$[\]/]/g, '_');
        subCatsObj[key] = { id: catName, name: catName, icon: getIcon(catName) };
      });

      await set(ref(database, `categories/${parentCatId}/subCategories`), subCatsObj);
      // Ensure isPlaylist is true
      await update(ref(database, `categories/${parentCatId}`), { isPlaylist: selectedSubCats.length > 0 });
      setShowSubModal(false);
    } catch (err) {
      alert('Gagal menyimpan sub-kategori: ' + err.message);
    }
  };

  const handleDeleteSub = async (catId, subId) => {
    if (window.confirm('Hapus sub-kategori ini?')) {
      await remove(ref(database, `categories/${catId}/subCategories/${subId}`));
    }
  };

  const handleAutoGenerateFolders = async () => {
    if (channelCategories.length === 0) return alert("Tidak ada kategori channel terdeteksi. Silakan import M3U terlebih dahulu di halaman Channels.");
    if (!window.confirm(`Sistem mendeteksi ${channelCategories.length} kategori unik di playlist. Buat folder otomatis untuk kategori yang belum ada?`)) return;

    try {
      let createdCount = 0;
      for (const catName of channelCategories) {
        // Check if already exists in categories list
        const exists = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());

        if (!exists) {
          const newRef = push(ref(database, 'categories'));
          await set(newRef, {
            id: newRef.key,
            name: catName,
            icon: getIcon(catName),
            colorHex: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
            isPlaylist: false,
            channelCount: 0
          });
          createdCount++;
        }
      }
      alert(`Berhasil membuat ${createdCount} folder baru!`);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Kategori & Playlist</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Buat folder Playlist lalu isi dengan kategori dari playlist M3U Anda.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handleAutoGenerateFolders} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 600 }}>
            ✨ Auto Folder
          </button>
          <button onClick={openAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Tambah Folder
          </button>
        </div>
      </div>

      {/* How it works banner */}
      <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
        <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>📁 Cara Kerja Playlist Folder</div>
        <ol style={{ color: 'var(--text-secondary)', paddingLeft: '1.25rem', margin: 0, lineHeight: 1.8 }}>
          <li>Buat folder baru (contoh: <b>Privat</b> atau <b>Premium</b>)</li>
          <li>Aktifkan mode <b>Playlist</b> pada folder tersebut</li>
          <li>Klik tombol <b>Kelola Isi</b> lalu pilih kategori yang ingin dimasukkan (Nasional, Sport, dll.)</li>
          <li>Di aplikasi TV, mengklik folder tersebut akan membuka <b>popup modal</b> berisi kategori pilihanmu</li>
        </ol>
      </div>

      {/* Channel categories summary */}
      {channelCategories.length > 0 && (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '0.875rem 1rem', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
          <span style={{ fontWeight: 600, color: '#34d399' }}>✅ Kategori tersedia dari playlist ({channelCategories.length}): </span>
          <span style={{ color: 'var(--text-secondary)' }}>{channelCategories.join(' • ')}</span>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Memuat...</p>
      ) : categories.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <Folder size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p>Belum ada folder playlist. Klik "Tambah Folder" untuk mulai.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {categories.map((cat) => (
            <div key={cat.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
                <div style={{ width: 42, height: 42, borderRadius: '10px', background: cat.colorHex || '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                  {cat.icon || '📺'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '600', fontSize: '1rem' }}>{cat.name}</span>
                    {cat.isPlaylist && (
                      <span style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 600 }}>📁 PLAYLIST</span>
                    )}
                    {(cat.subCategories?.length > 0) && (
                      <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                        {cat.subCategories.length} kategori
                      </span>
                    )}
                  </div>
                  {/* Show sub categories inline */}
                  {cat.subCategories?.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
                      {cat.subCategories.map(sub => (
                        <span key={sub.id} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {sub.icon} {sub.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
                  {cat.isPlaylist && (
                    <button onClick={() => openSubModal(cat)} style={{ padding: '0.4rem 0.7rem', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px', cursor: 'pointer', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      <FolderOpen size={14} /> Kelola Isi
                    </button>
                  )}
                  <button onClick={() => openEdit(cat)} style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', borderRadius: '4px' }}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(cat.id)} style={{ padding: '0.4rem', background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', borderRadius: '4px' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Category Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: 0 }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{editingId ? 'Edit Folder' : 'Tambah Folder Baru'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Folder / Kategori</label>
                <input className="form-input" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required placeholder="Privat, Premium, VIP..." />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Icon (Emoji)</label>
                <input className="form-input" value={formData.icon} onChange={e => setFormData(p => ({ ...p, icon: e.target.value }))} style={{ fontSize: '1.25rem' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Warna</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {DEFAULT_COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setFormData(p => ({ ...p, colorHex: c }))}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: formData.colorHex === c ? '3px solid white' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(139,92,246,0.08)', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.25)' }}>
                <input type="checkbox" id="isPlaylist" checked={formData.isPlaylist} onChange={e => setFormData(p => ({ ...p, isPlaylist: e.target.checked }))} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#8b5cf6' }} />
                <label htmlFor="isPlaylist" style={{ cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>📁 Mode Playlist (Folder)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Aktifkan lalu isi dengan kategori dari playlist. Di TV akan tampil popup saat diklik.</div>
                </label>
              </div>
              <button type="submit" className="btn-primary">Simpan</button>
            </form>
          </div>
        </div>
      )}

      {/* Manage Sub-categories Modal (Select from channel categories) */}
      {showSubModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: 0, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Kelola Isi Folder</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>📁 {parentCatName}</p>
              </div>
              <button onClick={() => setShowSubModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                Centang kategori dari playlist yang ingin dimasukkan ke dalam folder <b>{parentCatName}</b>. Di aplikasi TV, kategori yang dicentang akan muncul di popup modal saat folder diklik.
              </p>

              {channelCategories.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>
                  Tidak ada channel yang tersimpan. Import M3U playlist terlebih dahulu di halaman Channels.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {channelCategories.map(catName => {
                    const isSelected = selectedSubCats.includes(catName);
                    return (
                      <div
                        key={catName}
                        onClick={() => toggleSubCat(catName)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '1rem',
                          padding: '0.75rem 1rem',
                          borderRadius: '10px',
                          border: `1px solid ${isSelected ? 'rgba(139,92,246,0.5)' : 'var(--border-color)'}`,
                          background: isSelected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.03)',
                          cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        <div style={{
                          width: 22, height: 22, borderRadius: '5px', border: `2px solid ${isSelected ? '#8b5cf6' : 'var(--border-color)'}`,
                          background: isSelected ? '#8b5cf6' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {isSelected && <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 900 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: '1.1rem' }}>{getIcon(catName)}</span>
                        <span style={{ fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', flex: 1 }}>{catName}</span>
                        {isSelected && <span style={{ color: '#a78bfa', fontSize: '0.75rem', fontWeight: 600 }}>✓ Dipilih</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{selectedSubCats.length} kategori dipilih</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setShowSubModal(false)} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Batal</button>
                <button onClick={handleSaveSubs} className="btn-primary" style={{ padding: '0.6rem 1.25rem' }}>💾 Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
