import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { database } from '../firebase';
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronUp, FolderOpen, Tag } from 'lucide-react';

const DEFAULT_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#64748b'
];

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Add sub-category state
  const [showSubModal, setShowSubModal] = useState(false);
  const [parentCatId, setParentCatId] = useState(null);
  const [subForm, setSubForm] = useState({ name: '', icon: '📺' });
  const [editingSubId, setEditingSubId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    icon: '📺',
    colorHex: '#3b82f6',
    isPlaylist: false,
  });

  useEffect(() => {
    const catRef = ref(database, 'categories');
    const unsub = onValue(catRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([key, val]) => ({
          id: key,
          ...val,
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

  const openAdd = () => {
    setEditingId(null);
    setFormData({ name: '', icon: '📺', colorHex: '#3b82f6', isPlaylist: false });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditingId(cat.id);
    setFormData({
      name: cat.name || '',
      icon: cat.icon || '📺',
      colorHex: cat.colorHex || '#3b82f6',
      isPlaylist: cat.isPlaylist || false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await update(ref(database, `categories/${editingId}`), {
          name: formData.name,
          icon: formData.icon,
          colorHex: formData.colorHex,
          isPlaylist: formData.isPlaylist,
        });
      } else {
        const newRef = push(ref(database, 'categories'));
        await set(newRef, {
          id: newRef.key,
          name: formData.name,
          icon: formData.icon,
          colorHex: formData.colorHex,
          isPlaylist: formData.isPlaylist,
          channelCount: 0,
        });
      }
      setShowModal(false);
    } catch (err) {
      alert('Gagal menyimpan kategori: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin hapus kategori ini?')) {
      await remove(ref(database, `categories/${id}`));
    }
  };

  // Sub-category handlers
  const openAddSub = (catId) => {
    setParentCatId(catId);
    setEditingSubId(null);
    setSubForm({ name: '', icon: '📺' });
    setShowSubModal(true);
  };

  const openEditSub = (catId, sub) => {
    setParentCatId(catId);
    setEditingSubId(sub.id);
    setSubForm({ name: sub.name, icon: sub.icon || '📺' });
    setShowSubModal(true);
  };

  const handleSubSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSubId) {
        await update(ref(database, `categories/${parentCatId}/subCategories/${editingSubId}`), subForm);
      } else {
        const newRef = push(ref(database, `categories/${parentCatId}/subCategories`));
        await set(newRef, { id: newRef.key, ...subForm });
        // Set parent as playlist
        await update(ref(database, `categories/${parentCatId}`), { isPlaylist: true });
      }
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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Kategori & Playlist</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Kelola kategori channel. Aktifkan <b>Playlist</b> untuk menambahkan sub-kategori di dalamnya.
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> Tambah Kategori
        </button>
      </div>

      {/* Info Banner */}
      <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '0.875rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        💡 <b>Tips Playlist:</b> Aktifkan mode <b>Playlist</b> pada kategori, lalu tambahkan <b>Sub-Kategori</b> di dalamnya. Di aplikasi TV, mengklik kategori Playlist akan membuka popup modal untuk memilih sub-kategori.
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Memuat kategori...</p>
      ) : categories.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <Tag size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p>Belum ada kategori. Klik "Tambah Kategori" untuk memulai.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {categories.map((cat) => (
            <div key={cat.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Category Header Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem' }}>
                {/* Color dot + Icon */}
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: cat.colorHex || '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                  {cat.icon || '📺'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '600', fontSize: '1rem' }}>{cat.name}</span>
                    {cat.isPlaylist && (
                      <span style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 600 }}>
                        🎵 PLAYLIST
                      </span>
                    )}
                    {cat.subCategories?.length > 0 && (
                      <span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                        {cat.subCategories.length} sub-kategori
                      </span>
                    )}
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>ID: {cat.id}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
                  {cat.isPlaylist && (
                    <button
                      onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
                      style={{ padding: '0.4rem 0.7rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
                    >
                      <FolderOpen size={14} />
                      Sub
                      {expandedId === cat.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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

              {/* Sub-category panel */}
              {cat.isPlaylist && expandedId === cat.id && (
                <div style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 1.25rem', background: 'rgba(0,0,0,0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Sub-Kategori dalam "{cat.name}"</span>
                    <button onClick={() => openAddSub(cat.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', padding: '0.35rem 0.75rem', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                      <Plus size={13} /> Tambah Sub
                    </button>
                  </div>
                  {cat.subCategories?.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Belum ada sub-kategori. Klik "Tambah Sub" di atas.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {cat.subCategories.map((sub) => (
                        <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.35rem 0.65rem' }}>
                          <span>{sub.icon || '📺'}</span>
                          <span style={{ fontSize: '0.85rem' }}>{sub.name}</span>
                          <button onClick={() => openEditSub(cat.id, sub)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: 0 }}><Edit2 size={13} /></button>
                          <button onClick={() => handleDeleteSub(cat.id, sub.id)} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: 0 }}><Trash2 size={13} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Category Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', padding: 0 }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Kategori</label>
                <input className="form-input" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required placeholder="Nasional, Sport, Privat..." />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Icon (Emoji)</label>
                <input className="form-input" value={formData.icon} onChange={e => setFormData(p => ({ ...p, icon: e.target.value }))} placeholder="📺" style={{ fontSize: '1.25rem' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Warna</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {DEFAULT_COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setFormData(p => ({ ...p, colorHex: c }))}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: formData.colorHex === c ? '3px solid white' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
                <input type="color" value={formData.colorHex} onChange={e => setFormData(p => ({ ...p, colorHex: e.target.value }))}
                  style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid var(--border-color)', cursor: 'pointer', background: 'none', padding: 2 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <input type="checkbox" id="isPlaylist" checked={formData.isPlaylist} onChange={e => setFormData(p => ({ ...p, isPlaylist: e.target.checked }))} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                <label htmlFor="isPlaylist" style={{ cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>🎵 Mode Playlist</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Aktifkan untuk menambah sub-kategori. Di TV akan muncul popup saat diklik.</div>
                </label>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Simpan</button>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Sub-category Modal */}
      {showSubModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '380px', padding: 0 }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{editingSubId ? 'Edit Sub-Kategori' : 'Tambah Sub-Kategori'}</h2>
              <button onClick={() => setShowSubModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nama Sub-Kategori</label>
                <input className="form-input" value={subForm.name} onChange={e => setSubForm(p => ({ ...p, name: e.target.value }))} required placeholder="Drama, Action, VIP..." />
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  Nama ini harus cocok dengan nama setelah garis miring pada kategori channel. Contoh: jika kategori channel = <b>Privat / Drama</b>, isi dengan <b>Drama</b>.
                </small>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Icon (Emoji)</label>
                <input className="form-input" value={subForm.icon} onChange={e => setSubForm(p => ({ ...p, icon: e.target.value }))} placeholder="🎬" style={{ fontSize: '1.25rem' }} />
              </div>
              <button type="submit" className="btn-primary">Simpan</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
