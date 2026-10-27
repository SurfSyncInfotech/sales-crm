import { useState } from 'react';
import { X, Trophy, CheckCircle2, IndianRupee } from 'lucide-react';

export default function WonDealModal({ lead, onClose, onSubmit, busy }) {
  const [dealValue, setDealValue] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const numericVal = parseFloat(dealValue.replace(/[^0-9.]/g, ''));
    if (!dealValue || isNaN(numericVal) || numericVal <= 0) {
      setError('Please enter a valid deal / contract amount');
      return;
    }

    onSubmit({
      status: 'won',
      deal_value: numericVal,
      notes: notes.trim() ? `Closed deal: ₹${numericVal.toLocaleString()} | ${notes.trim()}` : `Closed deal: ₹${numericVal.toLocaleString()}`,
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
                backgroundColor: '#ecfdf5',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trophy size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Mark Deal as Won
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
          {/* Deal Value */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.4rem', color: '#334155' }}>
              Final Deal / Contract Value (₹) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '9px', color: '#64748b', fontSize: '0.9rem', fontWeight: '700' }}>
                ₹
              </span>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. 50,000"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  paddingLeft: '26px',
                  paddingRight: '12px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', marginBottom: '0.4rem', color: '#334155' }}>
              Closing Notes & Payment Terms (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. 50% advance received via Bank Transfer. Work starts Monday."
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
                backgroundColor: '#16a34a',
                color: '#fff',
                fontWeight: '700',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <CheckCircle2 size={15} />
              {busy ? 'Saving…' : 'Confirm Deal Won'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
