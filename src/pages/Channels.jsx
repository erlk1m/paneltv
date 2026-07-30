import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { database } from '../firebase';
import { Plus, Edit2, Trash2, X, Download, Link, AlertTriangle } from 'lucide-react';

const Channels = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [savedPlaylistUrl, setSavedPlaylistUrl] = useState('');
  const [savingPlaylist, setSavingPlaylist] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [importProgress, setImportProgress] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    streamUrl: '',
    streamType: 'HLS',
    drmType: 'NONE',
    licenseServer: '',
    logoUrl: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    const channelsRef = ref(database, 'channels');
    const unsubscribeChannels = onValue(channelsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const channelsList = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        setChannels(channelsList);
      } else {
        setChannels([]);
      }
      setLoading(false);
    });

    // Load saved playlist URL
    const settingsRef = ref(database, 'settings/playlistUrl');
    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      const url = snapshot.val() || '';
      setSavedPlaylistUrl(url);
      setPlaylistUrl(url);
    });

    return () => {
      unsubscribeChannels();
      unsubscribeSettings();
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '', category: '', streamUrl: '', streamType: 'HLS',
      drmType: 'NONE', licenseServer: '', logoUrl: '', status: 'ACTIVE'
    });
    setShowModal(true);
  };

  const openEditModal = (channel) => {
    setEditingId(channel.id);
    setFormData({
      name: channel.name || '',
      category: channel.category || '',
      streamUrl: channel.streamUrl || '',
      streamType: channel.streamType || 'HLS',
      drmType: channel.drmType || 'NONE',
      licenseServer: channel.licenseServer || '',
      logoUrl: channel.logoUrl || '',
      status: channel.status || 'ACTIVE'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus channel ini?')) {
      try {
        await remove(ref(database, `channels/${id}`));
      } catch (error) {
        console.error('Error deleting channel:', error);
        alert('Gagal menghapus channel');
      }
    }
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await remove(ref(database, 'channels'));
      setShowDeleteAllModal(false);
    } catch (error) {
      console.error('Error deleting all channels:', error);
      alert('Gagal menghapus semua channel');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await update(ref(database, `channels/${editingId}`), formData);
      } else {
        const newRef = push(ref(database, 'channels'));
        await set(newRef, { ...formData, id: newRef.key });
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving channel:', error);
      alert('Gagal menyimpan channel');
    }
  };

  const handleSavePlaylistUrl = async () => {
    setSavingPlaylist(true);
    try {
      await set(ref(database, 'settings/playlistUrl'), playlistUrl.trim());
      alert('URL Playlist berhasil disimpan!');
    } catch (error) {
      alert('Gagal menyimpan URL playlist');
    } finally {
      setSavingPlaylist(false);
    }
  };

  const runImport = async (url) => {
    setIsImporting(true);
    setImportProgress('Mengambil file M3U...');
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch M3U file');

      const text = await response.text();
      const lines = text.split('\n');
      let currentName = 'Unknown';
      let currentCategory = 'Uncategorized';
      let currentLogo = '';
      let currentDrmType = 'NONE';
      let currentLicenseKey = '';
      let importCount = 0;
      const batch = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('===')) continue;

        if (line.startsWith('#KODIPROP:inputstream.adaptive.license_type=clearkey')) {
          currentDrmType = 'CLEARKEY';
        } else if (line.startsWith('#KODIPROP:inputstream.adaptive.license_type=widevine')) {
          currentDrmType = 'WIDEVINE';
        } else if (line.startsWith('#KODIPROP:inputstream.adaptive.license_key=')) {
          currentLicenseKey = line.split('=').slice(1).join('=').trim();
        } else if (line.startsWith('#EXTINF:')) {
          const nameMatch = line.match(/tvg-name="([^"]+)"/);
          const commaIdx = line.lastIndexOf(',');
          currentName = nameMatch ? nameMatch[1] : (commaIdx !== -1 ? line.substring(commaIdx + 1).trim() : 'Unknown');
          if (!currentName) currentName = 'Unknown';

          const groupMatch = line.match(/group-title="([^"]+)"/);
          currentCategory = groupMatch ? groupMatch[1] : 'Uncategorized';

          const logoMatch = line.match(/tvg-logo="([^"]+)"/);
          currentLogo = logoMatch ? logoMatch[1] : '';

        } else if (line.startsWith('http')) {
          const actualUrl = line.split('|')[0];
          let streamType = 'HLS';
          if (actualUrl.includes('.mpd')) streamType = 'DASH';
          else if (actualUrl.includes('.mp4')) streamType = 'PROGRESSIVE';

          let licenseServer = '';
          if (currentDrmType === 'CLEARKEY' && currentLicenseKey.includes(':')) {
            try {
              if (currentLicenseKey.trim().startsWith('{')) {
                licenseServer = currentLicenseKey;
              } else {
                const keys = currentLicenseKey.split(',');
                const jsonKeys = keys.map(keyPair => {
                  const parts = keyPair.split(':');
                  if (parts.length !== 2) return null;
                  const kidBytes = hexToBase64Url(parts[0].trim());
                  const kBytes = hexToBase64Url(parts[1].trim());
                  return `{"kty":"oct","k":"${kBytes}","kid":"${kidBytes}"}`;
                }).filter(k => k !== null);
                if (jsonKeys.length > 0) licenseServer = `{"keys":[${jsonKeys.join(',')}],"type":"temporary"}`;
                else licenseServer = currentLicenseKey;
              }
            } catch (_) { licenseServer = currentLicenseKey; }
          } else if (currentDrmType === 'WIDEVINE') {
            licenseServer = currentLicenseKey;
          }

          batch.push({
            name: currentName,
            category: currentCategory,
            logoUrl: currentLogo,
            streamUrl: actualUrl,
            streamType,
            drmType: currentDrmType,
            licenseServer,
            isLive: true,
            qualities: ['HD'],
            status: 'ACTIVE'
          });

          importCount++;
          if (importCount % 20 === 0) setImportProgress(`Memproses ${importCount} channel...`);

          currentDrmType = 'NONE';
          currentLicenseKey = '';
        }
      }

      setImportProgress(`Menyimpan ${batch.length} channel ke Firebase...`);
      for (const ch of batch) {
        const newRef = push(ref(database, 'channels'));
        await set(newRef, { ...ch, id: newRef.key });
      }

      alert(`Berhasil mengimpor ${importCount} channel!`);
      return true;
    } catch (error) {
      console.error('Import error:', error);
      alert('Gagal mengimpor channel: ' + error.message);
      return false;
    } finally {
      setIsImporting(false);
      setImportProgress('');
    }
  };

  const handleSyncFromUrl = async () => {
    if (!playlistUrl) return alert("Masukkan URL playlist terlebih dahulu");
    if (!window.confirm("Tindakan ini akan MENGHAPUS semua channel lama di Firebase dan menggantinya dengan isi dari URL tersebut. Lanjutkan?")) return;

    setImportProgress('Membersihkan database...');
    await remove(ref(database, 'channels'));
    await runImport(playlistUrl);
  };

  const handleImportM3U = async (e) => {
    e.preventDefault();
    if (!importUrl) return;
    const success = await runImport(importUrl);
    if (success) {
      setShowImportModal(false);
      setImportUrl('');
    }
  };

  // Helper: hex string to base64url
  const hexToBase64Url = (hex) => {
    const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Channel Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{channels.length} channel di Firebase</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {channels.length > 0 && (
            <button
              className="btn"
              onClick={() => setShowDeleteAllModal(true)}
              style={{ backgroundColor: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <AlertTriangle size={18} /> Hapus Semua
            </button>
          )}
          <button className="btn btn-outline" onClick={() => setShowImportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} /> Import M3U
          </button>
          <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Tambah Channel
          </button>
        </div>
      </div>

      {/* Playlist URL Card */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Link size={20} color="var(--primary-color)" />
          <div>
            <h3 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>URL Playlist M3U (Langsung ke Aplikasi)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Masukkan URL playlist di sini. Aplikasi Android akan otomatis memuat semua channel dari URL ini <strong>tanpa perlu import ke Firebase</strong>.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="url"
            className="form-input"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            placeholder="https://raw.githubusercontent.com/.../vs1.m3u8"
            style={{ flex: 1, minWidth: '300px' }}
          />
          <button
            className="btn btn-outline"
            onClick={handleSavePlaylistUrl}
            disabled={savingPlaylist || playlistUrl === savedPlaylistUrl}
          >
            {savingPlaylist ? '...' : 'Simpan URL'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSyncFromUrl}
            disabled={isImporting || !playlistUrl}
            style={{ backgroundColor: '#10b981' }}
          >
            {isImporting ? 'Syncing...' : 'Sync ke Firebase'}
          </button>
        </div>
        {importProgress && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 600 }}>
            ⏳ {importProgress}
          </div>
        )}
        {savedPlaylistUrl && (
          <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.5rem' }}>
            ✓ URL aktif: {savedPlaylistUrl}
          </p>
        )}
      </div>

      {/* Channel Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat channel...</div>
        ) : channels.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ marginBottom: '0.5rem' }}>Belum ada channel di Firebase.</p>
            <p style={{ fontSize: '0.875rem' }}>Gunakan "Import M3U" untuk menambahkan, atau isi URL Playlist di atas agar aplikasi membaca langsung.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Nama</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Kategori</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Tipe</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>DRM</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((channel) => (
                <tr key={channel.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.875rem 1.5rem', fontWeight: '500' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {channel.logoUrl && (
                        <img src={channel.logoUrl} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, background: 'white' }} onError={e => e.target.style.display='none'} />
                      )}
                      {channel.name}
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1.5rem', color: 'var(--text-secondary)' }}>
                    <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                      {channel.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{channel.streamType}</td>
                  <td style={{ padding: '0.875rem 1.5rem' }}>
                    {channel.drmType && channel.drmType !== 'NONE' ? (
                      <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '600' }}>🔒 {channel.drmType}</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '0.875rem 1.5rem' }}>
                    <span style={{ color: channel.status === 'ACTIVE' ? '#10b981' : '#ef4444', fontSize: '0.875rem', fontWeight: '600' }}>
                      • {channel.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button onClick={() => openEditModal(channel)} style={{ padding: '0.4rem', backgroundColor: 'transparent', color: 'var(--primary-color)', borderRadius: '4px', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(channel.id)} style={{ padding: '0.4rem', backgroundColor: 'transparent', color: 'var(--danger-color)', borderRadius: '4px', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '0', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{editingId ? 'Edit Channel' : 'Tambah Channel Baru'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Nama Channel</label>
                <input type="text" name="name" className="form-input" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <input type="text" name="category" className="form-input" value={formData.category} onChange={handleInputChange} placeholder="Nasional, atau Playlist / Sub-kategori" required />
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>Gunakan garis miring untuk membuat Playlist. Contoh: <b>Privat / Drama</b></small>
              </div>
              <div className="form-group">
                <label className="form-label">Logo URL (opsional)</label>
                <input type="url" name="logoUrl" className="form-input" value={formData.logoUrl} onChange={handleInputChange} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label className="form-label">Stream URL</label>
                <input type="text" name="streamUrl" className="form-input" value={formData.streamUrl} onChange={handleInputChange} placeholder="https://..." required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Stream Type</label>
                  <select name="streamType" className="form-input" value={formData.streamType} onChange={handleInputChange} style={{ appearance: 'auto' }}>
                    <option value="HLS">HLS (.m3u8)</option>
                    <option value="DASH">DASH (.mpd)</option>
                    <option value="PROGRESSIVE">Progressive (.mp4)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">DRM Type</label>
                  <select name="drmType" className="form-input" value={formData.drmType} onChange={handleInputChange} style={{ appearance: 'auto' }}>
                    <option value="NONE">Tidak ada</option>
                    <option value="CLEARKEY">ClearKey</option>
                    <option value="WIDEVINE">Widevine</option>
                  </select>
                </div>
              </div>
              {formData.drmType !== 'NONE' && (
                <div className="form-group">
                  <label className="form-label">License Server / Key</label>
                  <input type="text" name="licenseServer" className="form-input" value={formData.licenseServer} onChange={handleInputChange} placeholder={formData.drmType === 'CLEARKEY' ? 'kid:key (hex format)' : 'https://license-server...'} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" className="form-input" value={formData.status} onChange={handleInputChange} style={{ appearance: 'auto' }}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '0' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Import M3U ke Firebase</h2>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleImportM3U} style={{ padding: '1.5rem' }}>
              <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: '#f59e0b' }}>
                  💡 <strong>Tips:</strong> Daripada import ke Firebase, lebih mudah pakai <strong>URL Playlist</strong> di atas — channel langsung tampil di aplikasi tanpa import!
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">URL File M3U</label>
                <input
                  type="url"
                  className="form-input"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://raw.githubusercontent.com/.../vs1.m3u8"
                  required
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  URL harus mendukung CORS. Gunakan raw.githubusercontent.com untuk file di GitHub.
                </p>
              </div>
              {importProgress && (
                <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--primary-color)' }}>
                  ⏳ {importProgress}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowImportModal(false)} disabled={isImporting}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isImporting}>
                  {isImporting ? 'Mengimpor...' : 'Mulai Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '2rem', textAlign: 'center' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Hapus Semua Channel?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Tindakan ini akan menghapus <strong>{channels.length} channel</strong> dari Firebase secara permanen. Tidak bisa dibatalkan!
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => setShowDeleteAllModal(false)} disabled={isDeletingAll}>Batal</button>
              <button
                className="btn"
                onClick={handleDeleteAll}
                disabled={isDeletingAll}
                style={{ backgroundColor: '#ef4444', color: 'white' }}
              >
                {isDeletingAll ? 'Menghapus...' : `Ya, Hapus ${channels.length} Channel`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Channels;
