import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function PublicLeadCapturePage() {
  const { webhookKey } = useParams();
  const [searchParams] = useSearchParams();
  const campaignDefault = searchParams.get('campaign') || '';

  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    campaign: campaignDefault,
    message: '',
  });

  useEffect(() => {
    fetch(`${API_BASE}/public/leads/form/${webhookKey}/config`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Capture form unavailable');
        setConfig(data);
      })
      .catch((err) => setError(err.message));
  }, [webhookKey]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/public/leads/form/${webhookKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit');
      setSuccess(`Lead received. ID: ${data.lead_code}`);
      setForm({
        name: '',
        phone: '',
        email: '',
        company: '',
        campaign: campaignDefault,
        message: '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="capture-page">
      <form className="capture-card" onSubmit={handleSubmit}>
        <img src="/surfsync-logo-clear.png" alt="SurfSync" className="capture-logo" />
        <h1>{config?.company?.name || 'Lead capture'}</h1>
        <p className="muted">{config?.source?.name || 'Website / Landing form'}</p>

        {error && <div className="alert">{error}</div>}
        {success && <div className="capture-success">{success}</div>}

        <label>
          Name *
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </label>
        <label>
          Company
          <input
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          />
        </label>
        <label>
          Campaign
          <input
            value={form.campaign}
            onChange={(e) => setForm((f) => ({ ...f, campaign: e.target.value }))}
          />
        </label>
        <label>
          Message
          <textarea
            rows={3}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          />
        </label>
        <button type="submit" className="primary-btn" disabled={busy || !config}>
          {busy ? 'Submitting…' : 'Submit enquiry'}
        </button>
      </form>
    </div>
  );
}
