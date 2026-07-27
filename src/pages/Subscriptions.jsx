import React, { useState, useEffect } from 'react';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { database } from '../firebase';
import { CreditCard, Plus, Trash2, Zap } from 'lucide-react';

const defaultPlans = [
  { name: 'Trial', durationDays: 1, price: 0, description: 'Akses gratis 1 hari' },
  { name: 'Basic', durationDays: 30, price: 30000, description: 'Akses 1 bulan' },
  { name: 'Premium', durationDays: 365, price: 250000, description: 'Akses 1 tahun' },
  { name: 'Lifetime', durationDays: 36500, price: 500000, description: 'Akses seumur hidup' },
];

const Subscriptions = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', durationDays: 30, price: 0, description: '' });
  const [showForm, setShowForm] = useState(false);
  const [quickGenPlan, setQuickGenPlan] = useState(null);
  const [quickToken, setQuickToken] = useState('');

  useEffect(() => {
    const unsubscribe = onValue(ref(database, 'plans'), (snapshot) => {
      const data = snapshot.val() || {};
      setPlans(Object.entries(data).map(([k, v]) => ({ id: k, ...v })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const seedDefaultPlans = () => {
    if (!window.confirm('Tambahkan paket default? Ini tidak akan menghapus paket yang sudah ada.')) return;
    defaultPlans.forEach(plan => {
      push(ref(database, 'plans'), { ...plan, createdAt: Date.now() });
    });
  };

  const addPlan = () => {
    if (!form.name.trim()) return alert('Nama paket harus diisi!');
    push(ref(database, 'plans'), { ...form, createdAt: Date.now() })
      .then(() => { setForm({ name: '', durationDays: 30, price: 0, description: '' }); setShowForm(false); })
      .catch(e => alert('Error: ' + e.message));
  };

  const deletePlan = (id) => {
    if (!window.confirm('Hapus paket ini?')) return;
    remove(ref(database, 'plans/' + id)).catch(e => alert('Error: ' + e.message));
  };

  const generateFromPlan = (plan) => {
    let finalToken = quickToken.trim() || ('VIP-' + Math.random().toString(36).substring(2, 10).toUpperCase());
    if (/[.#$[\]]/.test(finalToken)) return alert('Token mengandung karakter tidak valid!');
    const expiresAt = Date.now() + (plan.durationDays * 24 * 60 * 60 * 1000);
    set(ref(database, 'access_tokens/' + finalToken), {
      token: finalToken, type: 'PREMIUM', expiresAt, isActive: true, deviceId: null,
      planName: plan.name, createdAt: Date.now()
    }).then(() => {
      alert(`✅ Token "${finalToken}" berhasil dibuat!\nPaket: ${plan.name}\nExpiry: ${new Date(expiresAt).toLocaleString('id-ID')}`);
      setQuickGenPlan(null); setQuickToken('');
    }).catch(e => alert('Error: ' + e.message));
  };

  const formatPrice = (p) => p === 0 ? 'Gratis' : `Rp ${p.toLocaleString('id-ID')}`;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2><CreditCard className="inline-icon" /> Subscription Plans</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Kelola paket langganan dan generate token dari paket</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {plans.length === 0 && !loading && (
            <button className="btn btn-outline" onClick={seedDefaultPlans} style={{ fontSize: 13 }}>
              ⚡ Isi Paket Default
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ fontSize: 13 }}>
            <Plus size={16} /> Tambah Paket
          </button>
        </div>
      </div>

      {/* Add Plan Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--primary-color)' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Tambah Paket Baru</h3>
          <div className="token-form" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Nama Paket</label>
                <input className="form-input" placeholder="Premium" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Durasi (hari)</label>
                <input className="form-input" type="number" min="1" value={form.durationDays} onChange={e => setForm({ ...form, durationDays: Number(e.target.value) })} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Harga (Rp)</label>
                <input className="form-input" type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
            </div>
            <div className="form-group" style={{ margin: '0.75rem 0 0' }}>
              <label className="form-label">Deskripsi</label>
              <input className="form-input" placeholder="Akses premium selama..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn btn-primary" onClick={addPlan} style={{ fontSize: 13 }}><Plus size={15} /> Simpan</button>
              <button className="btn btn-outline" onClick={() => setShowForm(false)} style={{ fontSize: 13 }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Generate Modal */}
      {quickGenPlan && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 420 }}>
            <h3 style={{ marginBottom: '1rem' }}>⚡ Generate Token — {quickGenPlan.name}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: '1rem' }}>
              Durasi: <strong>{quickGenPlan.durationDays} hari</strong> · Harga: <strong>{formatPrice(quickGenPlan.price)}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Custom Token (opsional)</label>
              <input className="form-input" placeholder="Biarkan kosong untuk auto-generate" value={quickToken} onChange={e => setQuickToken(e.target.value.toUpperCase())} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={() => generateFromPlan(quickGenPlan)} style={{ flex: 1 }}>
                <Zap size={16} /> Generate
              </button>
              <button className="btn btn-outline" onClick={() => { setQuickGenPlan(null); setQuickToken(''); }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Loading plans...</div>
      ) : plans.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Belum ada paket. Klik "Isi Paket Default" untuk mulai.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {plans.map(plan => (
            <div key={plan.id} className="card" style={{ position: 'relative', borderTop: '3px solid var(--primary-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{plan.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{plan.description}</div>
                </div>
                <button className="btn btn-danger" onClick={() => deletePlan(plan.id)} style={{ padding: '5px 8px' }}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div style={{ margin: '1rem 0', display: 'flex', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-color)' }}>{formatPrice(plan.price)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{plan.durationDays} hari</div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setQuickGenPlan(plan)} style={{ width: '100%', fontSize: 13 }}>
                <Zap size={15} /> Generate Token Sekarang
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
