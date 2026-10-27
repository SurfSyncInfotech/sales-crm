import { useState, useEffect } from 'react';
import { X, Send, AlertCircle, FileText, Check, Plus, RotateCcw, MessageSquare, Mic } from 'lucide-react';

const COMMON_SERVICES = [
  'Website Design & Development',
  'Custom Web Application',
  'Mobile App (Android / iOS)',
  'SEO & Digital Marketing',
  'Sales CRM Software',
  'Maintenance & Support',
  'Cloud Infrastructure Setup',
  'Custom Software Solution',
];

export default function QuotationRequestModal({ lead, onClose, onSubmit, busy }) {
  const isRevision = lead?.status === 'quotation_sent' || Boolean(lead?.quotation_sent_at) || Boolean(lead?.is_revision);

  const [selectedServices, setSelectedServices] = useState([]);
  const [customService, setCustomService] = useState('');
  const [scope, setScope] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (lead?.quotation_services) {
      const existing = lead.quotation_services
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      setSelectedServices(existing);
    }
    if (lead?.quotation_scope) {
      setScope(lead.quotation_scope);
    }
  }, [lead]);

  function toggleService(service) {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  }

  function handleAddCustomService() {
    if (customService.trim() && !selectedServices.includes(customService.trim())) {
      setSelectedServices((prev) => [...prev, customService.trim()]);
      setCustomService('');
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (selectedServices.length === 0) {
      setError('Please select or specify at least one service requested by the client.');
      return;
    }

    if (isRevision && !budget.trim()) {
      setError("Please specify the client's counter-offer / target budget.");
      return;
    }

    if (!notes.trim()) {
      setError(
        isRevision
          ? 'Please provide negotiation notes / client feedback for Admin.'
          : 'Please provide specific client requirements & notes for the Admin.'
      );
      return;
    }

    const finalNotes = isRevision
      ? `[REVISION / NEGOTIATION] Client Target Budget: ₹${budget.trim()} | ${notes.trim()}`
      : `${notes.trim()}${budget ? ` | Estimated Budget: ${budget.trim()}` : ''}`;

    onSubmit({
      status: 'quotation_requested',
      quotation_services: selectedServices.join(', '),
      quotation_scope: scope.trim(),
      quotation_notes: finalNotes,
      is_revision: isRevision,
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
          borderRadius: '12px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isRevision ? (
                <RotateCcw size={18} color="#ea580c" />
              ) : (
                <FileText size={18} color="#0d9488" />
              )}
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                {isRevision ? 'Request Revised Quotation (Negotiation)' : 'Quotation Request to Admin'}
              </h2>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              For Lead: <strong>{lead?.name}</strong> ({lead?.phone || lead?.email || 'No contact info'})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* WhatsApp Negotiation Banner for Revision */}
        {isRevision && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#fff7ed',
              color: '#9a3412',
              border: '1px solid #fed7aa',
              borderRadius: '8px',
              fontSize: '0.82rem',
              marginBottom: '1rem',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
            }}
          >
            <MessageSquare size={16} color="#ea580c" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Client WhatsApp Negotiation:</strong> Client reviewed previous quote and responded with budget/scope adjustments. Enter their counter-offer below so Admin can review and issue a revised quote.
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Services Requested */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.5rem', color: '#334155' }}>
              What kind of services does the client want? <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '0.5rem' }}>
              {COMMON_SERVICES.map((srv) => {
                const active = selectedServices.includes(srv);
                return (
                  <button
                    key={srv}
                    type="button"
                    onClick={() => toggleService(srv)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.8rem',
                      borderRadius: '999px',
                      cursor: 'pointer',
                      border: active ? (isRevision ? '1px solid #ea580c' : '1px solid #0d9488') : '1px solid #cbd5e1',
                      backgroundColor: active ? (isRevision ? '#ea580c' : '#0d9488') : '#f8fafc',
                      color: active ? '#fff' : '#334155',
                      fontWeight: active ? '600' : '400',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {active ? <Check size={12} /> : <Plus size={12} />}
                    {srv}
                  </button>
                );
              })}
            </div>

            {/* Custom service add */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Or type other service and hit Add..."
                value={customService}
                onChange={(e) => setCustomService(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomService();
                  }
                }}
                style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              <button
                type="button"
                onClick={handleAddCustomService}
                className="ghost-btn"
                style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Project Scope & Deliverables */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.4rem', color: '#334155' }}>
              {isRevision ? 'Revised Scope & Adjustments' : 'Scope & Deliverables (Pages, Features, Specifications)'}
            </label>
            <textarea
              rows={3}
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder={isRevision ? "e.g. Remove SEO module, deliver core 5-page website and CMS only..." : "e.g. 5-page business website with contact form, WhatsApp chat button..."}
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          {/* Target Budget / Counter-Offer */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.4rem', color: '#334155' }}>
              {isRevision ? "Client Counter-Offer / Target Budget (₹)" : "Client Estimated Budget / Expected Quote (Optional)"}{' '}
              {isRevision && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            <input
              type="text"
              required={isRevision}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder={isRevision ? "e.g. 35000 (Exact budget client is willing to pay)" : "e.g. ₹25,000 - ₹35,000"}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '0.85rem',
                borderRadius: '6px',
                border: isRevision ? '1.5px solid #fdba74' : '1px solid #cbd5e1',
                backgroundColor: isRevision ? '#fffbf5' : '#fff',
                fontWeight: isRevision ? '600' : '400',
              }}
            />
          </div>

          {/* Detailed Notes for Admin */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '4px' }}>
              <label style={{ fontWeight: '600', fontSize: '0.88rem', margin: 0, color: '#334155' }}>
                {isRevision ? "Negotiation Summary & Admin Instructions" : "Specific Notes & Client Instructions for Company Admin"}{' '}
                <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#0d9488',
                  backgroundColor: '#f0fdfa',
                  border: '1px solid #ccfbf1',
                  padding: '2px 8px',
                  borderRadius: '5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: '600',
                }}
                title="Press Win + H on your keyboard to speak into mic"
              >
                <Mic size={11} color="#0d9488" />
                <span>Voice-to-Text: Press <kbd style={{ padding: '1px 5px', backgroundColor: '#fff', border: '1px solid #99f6e4', borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: '800', color: '#0f766e' }}>Win + H</kbd> for Mic</span>
              </span>
            </div>
            <textarea
              rows={3}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isRevision
                  ? "e.g. Client stated initial quote is above budget. If we agree to ₹35,000, they will transfer 50% advance today."
                  : "e.g. Client requested a 10% first-time discount. Send quote by today evening to client email..."
              }
              style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} className="ghost-btn" disabled={busy}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={busy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.6rem 1.25rem',
                backgroundColor: isRevision ? '#ea580c' : '#0d9488',
                color: '#fff',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              {isRevision ? <RotateCcw size={15} /> : <Send size={15} />}
              {busy
                ? 'Submitting to Admin…'
                : isRevision
                ? 'Submit Revised Quote Request'
                : 'Submit Request to Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
