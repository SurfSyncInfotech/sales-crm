import { useEffect, useState } from 'react';
import { plansApi } from '../api/client';
import {
  Package,
  Plus,
  Check,
  X,
  Sparkles,
  Users,
  Inbox,
  MessageSquare,
  PhoneCall,
  Shield,
  Layers,
} from 'lucide-react';

function money(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

const empty = {
  name: '',
  slug: '',
  description: '',
  price_monthly: '',
  price_yearly: '',
  max_salespersons: 5,
  max_leads: 1000,
  whatsapp_messages: 1000,
  call_minutes: 500,
  features: '',
};

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const data = await plansApi.list();
    setPlans(data.plans || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === 'name' && !form.slug) {
      setForm((f) => ({
        ...f,
        name: value,
        slug: value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
      }));
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await plansApi.create({
        ...form,
        price_monthly: Number(form.price_monthly || 0),
        price_yearly: Number(form.price_yearly || 0),
        max_salespersons: Number(form.max_salespersons),
        max_leads: Number(form.max_leads),
        whatsapp_messages: Number(form.whatsapp_messages),
        call_minutes: Number(form.call_minutes),
        features: form.features
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setForm(empty);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sa-plans-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .sa-plans-page,
        .sa-plans-page * {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          box-sizing: border-box;
        }
        .sa-field-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #374151;
          margin-bottom: 6px;
        }
        .sa-form-input {
          width: 100%;
          height: 38px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid #D0D5DD;
          background-color: #FFFFFF;
          font-size: 13.5px;
          color: #111827;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .sa-form-input:focus {
          border-color: #0B6BE6;
          box-shadow: 0 0 0 4px rgba(11, 107, 230, 0.15);
        }
      `}</style>

      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#07A96A',
              marginBottom: '4px',
            }}
          >
            <span>Subscriptions & Packaging</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>Commercial Tiers</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
            Subscription Plans
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '13.5px' }}>
            Define tier pricing, seat allowances, lead ingestion caps, and bundled communication quotas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            height: '40px',
            padding: '0 18px',
            borderRadius: '12px',
            background: showForm ? '#FFFFFF' : 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
            border: showForm ? '1px solid #D0D5DD' : 'none',
            color: showForm ? '#374151' : '#FFFFFF',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: showForm ? 'none' : '0 1px 2px rgba(3, 111, 69, 0.35)',
          }}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          <span>{showForm ? 'Close form' : '+ Add Plan'}</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#FEECEC', color: '#DC2626', border: '1px solid #FECACA', fontSize: '13.5px', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* 2. Create Plan Form */}
      {showForm && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '24px', boxShadow: '0 1px 3px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #F3F4F6', paddingBottom: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#E8F8F0', color: '#07A96A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>Configure New Plan Tier</h3>
              <p style={{ fontSize: '12.5px', color: '#6B7280', margin: '2px 0 0 0' }}>Set plan identity, pricing thresholds, and quota parameters.</p>
            </div>
          </div>

          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label className="sa-field-label">Plan Name *</label>
                <input value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="e.g. Growth Pro" className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">Slug identifier *</label>
                <input value={form.slug} onChange={(e) => update('slug', e.target.value)} required placeholder="growth-pro" className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">Monthly Price (INR) *</label>
                <input type="number" value={form.price_monthly} onChange={(e) => update('price_monthly', e.target.value)} required placeholder="4999" className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">Yearly Price (INR)</label>
                <input type="number" value={form.price_yearly} onChange={(e) => update('price_yearly', e.target.value)} placeholder="49990" className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">Max Sales Seats</label>
                <input type="number" value={form.max_salespersons} onChange={(e) => update('max_salespersons', e.target.value)} className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">Max Leads Ingestion</label>
                <input type="number" value={form.max_leads} onChange={(e) => update('max_leads', e.target.value)} className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">WhatsApp Messages Quota</label>
                <input type="number" value={form.whatsapp_messages} onChange={(e) => update('whatsapp_messages', e.target.value)} className="sa-form-input" />
              </div>
              <div>
                <label className="sa-field-label">Call Minutes Quota</label>
                <input type="number" value={form.call_minutes} onChange={(e) => update('call_minutes', e.target.value)} className="sa-form-input" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label className="sa-field-label">Description</label>
                <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={2} placeholder="Target business profile or value proposition..." className="sa-form-input" style={{ height: 'auto', padding: '10px 12px' }} />
              </div>
              <div>
                <label className="sa-field-label">Feature Highlights (Comma separated)</label>
                <input value={form.features} onChange={(e) => update('features', e.target.value)} placeholder="Official WABA, Lead Auto-Cadence, Live Call Copilot, Instant PDF Invoicing" className="sa-form-input" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: '10px',
                  border: '1px solid #D0D5DD',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                style={{
                  height: '38px',
                  padding: '0 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 2px rgba(3, 111, 69, 0.35)',
                }}
              >
                {busy ? 'Saving Plan…' : 'Add Plan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Plans Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {plans.map((p) => {
          const features = Array.isArray(p.features)
            ? p.features
            : typeof p.features === 'string'
            ? JSON.parse(p.features || '[]')
            : [];

          return (
            <div
              key={p.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E6E9EE',
                borderRadius: '18px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(16,24,40,0.04)',
                position: 'relative',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>{p.name}</h2>
                    <span style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                      {p.slug}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#07A96A',
                      backgroundColor: '#E8F8F0',
                      padding: '3px 9px',
                      borderRadius: '9999px',
                      border: '1px solid #B7E8D2',
                    }}
                  >
                    {p.company_count || 0} companies
                  </span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                      {money(p.price_monthly)}
                    </span>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>/ month</span>
                  </div>
                  {p.price_yearly > 0 && (
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                      Yearly billing: <strong style={{ color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{money(p.price_yearly)}</strong>
                    </div>
                  )}
                </div>

                {p.description && (
                  <p style={{ fontSize: '13px', color: '#4B5563', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                    {p.description}
                  </p>
                )}

                {/* Quota Specs List */}
                <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#374151' }}>
                    <Check size={14} color="#07A96A" />
                    <span><strong style={{ fontVariantNumeric: 'tabular-nums' }}>{p.max_salespersons}</strong> Sales Representative Seats</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#374151' }}>
                    <Check size={14} color="#07A96A" />
                    <span><strong style={{ fontVariantNumeric: 'tabular-nums' }}>{Number(p.max_leads || 0).toLocaleString()}</strong> Lead Storage Capacity</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#374151' }}>
                    <Check size={14} color="#07A96A" />
                    <span><strong style={{ fontVariantNumeric: 'tabular-nums' }}>{Number(p.whatsapp_messages || 0).toLocaleString()}</strong> WhatsApp Messages / mo</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#374151' }}>
                    <Check size={14} color="#07A96A" />
                    <span><strong style={{ fontVariantNumeric: 'tabular-nums' }}>{Number(p.call_minutes || 0).toLocaleString()}</strong> Call Minutes / mo</span>
                  </div>

                  {features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#374151' }}>
                      <Check size={14} color="#07A96A" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
