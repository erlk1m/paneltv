import React, { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../firebase';
import { Settings as SettingsIcon, Save, AlertTriangle, Power, RefreshCw } from 'lucide-react';

const Settings = () => {
  const [config, setConfig] = useState({
    appName: 'Erlkim IPTV',
    logoUrl: '',
    trialDays: 1,
    maintenanceMode: false,
    maintenanceMessage: 'Sistem sedang dalam pemeliharaan. Coba lagi nanti.',
    forceUpdate: false,
    minVersion: '1.0.0',
    updateUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onValue(ref(database, 'app_config'), (snapshot) => {
      if (snapshot.val()) {
        setConfig(prev => ({ ...prev, ...snapshot.val() }));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await set(ref(database, 'app_config'), { ...config, updatedAt: Date.now() });
      alert('✅ Konfigurasi berhasil disimpan!');
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const SectionCard = ({ title, children }) => (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        {title}
      </h3>
      {children}
    </div>
  );

  const Toggle = ({ label, value, onChange, description, danger }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: danger && value ? '#ef4444' : 'var(--text-primary)' }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{description}</div>}
      </div>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 48, height: 26, borderRadius: 999, cursor: 'pointer', transition: 'background 0.2s',
          backgroundColor: value ? (danger ? '#ef4444' : '#3b82f6') : 'var(--border-color)',
          position: 'relative', flexShrink: 0
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: '50%', backgroundColor: 'white',
          position: 'absolute', top: 3, left: value ? 25 : 3, transition: 'left 0.2s'
        }} />
      </div>
    </div>
  );

  if (loading) return <div style={{ padding: '2rem' }}>Loading settings...</div>;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2><SettingsIcon className="inline-icon" /> Settings</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Konfigurasi aplikasi, update, dan maintenance</p>
        </div>
        <button className="btn btn-primary" onClick={saveConfig} disabled={saving} style={{ fontSize: 13 }}>
          <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Semua'}
        </button>
      </div>

      {/* General */}
      <SectionCard title="⚙️ General">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Nama Aplikasi</label>
            <input className="form-input" value={config.appName} onChange={e => setConfig({ ...config, appName: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Logo URL</label>
            <input className="form-input" placeholder="https://..." value={config.logoUrl} onChange={e => setConfig({ ...config, logoUrl: e.target.value })} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Durasi Trial (hari)</label>
            <input className="form-input" type="number" min="1" value={config.trialDays} onChange={e => setConfig({ ...config, trialDays: Number(e.target.value) })} />
          </div>
        </div>
      </SectionCard>

      {/* Maintenance */}
      <SectionCard title="🔧 Maintenance Mode">
        <Toggle
          label="Maintenance Mode"
          value={config.maintenanceMode}
          onChange={v => setConfig({ ...config, maintenanceMode: v })}
          description="Saat aktif, semua pengguna di aplikasi TV akan melihat pesan maintenance"
          danger
        />
        {config.maintenanceMode && (
          <div style={{ marginTop: '1rem' }}>
            <div className="card" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 13 }}>Maintenance mode sedang <strong style={{ color: '#ef4444' }}>AKTIF</strong>. Pengguna tidak bisa mengakses aplikasi.</div>
            </div>
            <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
              <label className="form-label">Pesan Maintenance</label>
              <textarea
                className="form-input"
                rows={3}
                value={config.maintenanceMessage}
                onChange={e => setConfig({ ...config, maintenanceMessage: e.target.value })}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
        )}
      </SectionCard>

      {/* Force Update */}
      <SectionCard title="🔄 Force Update">
        <Toggle
          label="Force Update"
          value={config.forceUpdate}
          onChange={v => setConfig({ ...config, forceUpdate: v })}
          description="Paksa pengguna update aplikasi jika versi lebih rendah dari versi minimum"
        />
        {config.forceUpdate && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Versi Minimum</label>
              <input className="form-input" placeholder="1.0.0" value={config.minVersion} onChange={e => setConfig({ ...config, minVersion: e.target.value })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">URL Download Update</label>
              <input className="form-input" placeholder="https://..." value={config.updateUrl} onChange={e => setConfig({ ...config, updateUrl: e.target.value })} />
            </div>
          </div>
        )}
      </SectionCard>

      <div style={{ textAlign: 'right' }}>
        <button className="btn btn-primary" onClick={saveConfig} disabled={saving} style={{ fontSize: 14 }}>
          <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
