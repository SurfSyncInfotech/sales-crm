import { useState } from 'react';
import { X, XCircle, AlertTriangle } from 'lucide-react';

const REASONS = [
  'High Price / Budget Constraint',
  'Went with Competitor',
  'Project Cancelled / Postponed',
  'Client Unreachable / No Response',
  'Feature / Scope Mismatch',
  'Timing Issue / Not Ready',
  'Other',
];

export default function LostDealModal({ lead, onClose, onSubmit, busy }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const fullReason = notes.trim() ? `${reason}: ${notes.trim()}` : reason;

    onSubmit({
      status: 'lost',
      lost_reason: fullReason,
      notes: `Deal Lost: ${fullReason}`,
    });
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '480px',
          padding: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <XCircle size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Mark Deal as Lost
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Lead: <strong>{lead?.name}</strong>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.65rem 0.9rem',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              borderRadius: '6px',
              fontSize: '0.82rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Reason selection */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.4rem', color: '#334155' }}>
              Why was this deal lost? <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: '0.85rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                outline: 'none',
              }}
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Feedback & Notes */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.4rem', color: '#334155' }}>
              Additional Client Feedback / Details
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Client mentioned competitor offered ₹10,000 lower price. Follow up again in 6 months."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px',
                fontSize: '0.85rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} className="ghost-btn" disabled={busy}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: '#fff',
                fontWeight: '700',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <XCircle size={15} />
              {busy ? 'Saving…' : 'Record Deal Lost'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
