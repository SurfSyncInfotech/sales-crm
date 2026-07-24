import { useEffect, useState } from 'react';
import { plansApi } from '../api/client';

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

  async function load() {
    const data = await plansApi.list();
    setPlans(data.plans);
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
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Subscriptions</p>
          <h1>Plans</h1>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="plan-cards">
        {plans.map((p) => {
          const features = Array.isArray(p.features)
            ? p.features
            : typeof p.features === 'string'
              ? JSON.parse(p.features || '[]')
              : [];
          return (
            <article key={p.id} className="plan-card">
              <div className="plan-card-top">
                <h2>{p.name}</h2>
                <span className="badge badge-active">{p.company_count} companies</span>
              </div>
              <p className="plan-price">
                {money(p.price_monthly)}
                <small>/ month</small>
              </p>
              <p className="muted">{p.description}</p>
              <ul>
                <li>{p.max_salespersons} sales seats</li>
                <li>{p.max_leads.toLocaleString()} leads</li>
                <li>{p.whatsapp_messages.toLocaleString()} WhatsApp msgs</li>
                <li>{p.call_minutes.toLocaleString()} call minutes</li>
                {features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="muted">Yearly · {money(p.price_yearly)}</p>
            </article>
          );
        })}
      </div>

      <form className="panel form-grid" onSubmit={handleCreate}>
        <h2>Create plan</h2>
        <label>
          Name
          <input value={form.name} onChange={(e) => update('name', e.target.value)} required />
        </label>
        <label>
          Slug
          <input value={form.slug} onChange={(e) => update('slug', e.target.value)} required />
        </label>
        <label>
          Monthly price
          <input
            type="number"
            value={form.price_monthly}
            onChange={(e) => update('price_monthly', e.target.value)}
            required
          />
        </label>
        <label>
          Yearly price
          <input type="number" value={form.price_yearly} onChange={(e) => update('price_yearly', e.target.value)} />
        </label>
        <label>
          Max salespersons
          <input
            type="number"
            value={form.max_salespersons}
            onChange={(e) => update('max_salespersons', e.target.value)}
          />
        </label>
        <label>
          Max leads
          <input type="number" value={form.max_leads} onChange={(e) => update('max_leads', e.target.value)} />
        </label>
        <label className="full">
          Description
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={2} />
        </label>
        <label className="full">
          Features (comma separated)
          <input value={form.features} onChange={(e) => update('features', e.target.value)} />
        </label>
        <div className="full form-actions">
          <button type="submit" className="primary-btn" disabled={busy}>
            {busy ? 'Saving…' : 'Add plan'}
          </button>
        </div>
      </form>
    </div>
  );
}
