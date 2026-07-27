import React, { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../firebase';
import { Save } from 'lucide-react';

const Settings = () => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const settingsRef = ref(database, 'settings/playlistUrl');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setPlaylistUrl(val);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await set(ref(database, 'settings/playlistUrl'), playlistUrl);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure global application settings</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          M3U Playlist Source
        </h3>
        
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading settings...</p>
        ) : (
          <form onSubmit={handleSave}>
            {message && (
              <div style={{
                backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: message.type === 'success' ? '#10b981' : '#ef4444',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                {message.text}
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Global Playlist URL</label>
              <input 
                type="url" 
                className="form-input" 
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                placeholder="https://..."
              />
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                This URL will be automatically fetched and parsed by the Android App. Leave empty if you only want to use manually added channels.
              </p>
            </div>
            
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Settings;
