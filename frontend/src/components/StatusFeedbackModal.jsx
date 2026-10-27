import React, { useState } from 'react';
import { X, MessageSquareText, ArrowRight, AlertCircle, CheckCircle2, Monitor, Mic } from 'lucide-react';

export default function StatusFeedbackModal({
  isOpen,
  lead,
  targetStatus,
  targetStatusLabel,
  onClose,
  onSubmit,
  isSubmitting,
  submitting,
}) {
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const isBusy = Boolean(isSubmitting || submitting);
  const show = isOpen !== undefined ? isOpen : Boolean(lead);

  if (!show || !lead) return null;

  const isDemo = targetStatus === 'demo_requested';
  const currentStatusLabel = lead.status?.replace(/_/g, ' ') || 'New';
  const nextLabel = targetStatusLabel || (isDemo ? 'Demo / Details Requested' : targetStatus?.replace(/_/g, ' ') || 'Next Stage');

  function handleSubmit(e) {
    e.preventDefault();
    if (!feedback.trim()) {
      setError(isDemo ? 'Please specify what demo website / details the client requested.' : 'Please enter feedback / discussion notes for this status update.');
      return;
    }
    setError('');
    onSubmit({
      feedback: feedback.trim(),
      demo_notes: isDemo ? feedback.trim() : undefined,
    });
  }

  return (
    <div className="surfsync-modal-overlay">
      <div className="surfsync-modal-content" style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div
          style={{
            padding: '1.1rem 1.35rem',
            borderBottom: '1px solid #E6E9EE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFAFB',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: isDemo ? '#E8F6FA' : '#FFF3E6',
                color: isDemo ? '#2A9CB8' : '#F68713',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isDemo ? <Monitor size={17} /> : <MessageSquareText size={17} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#111827' }}>
                {isDemo ? 'Demo Website & Details Request' : 'Stage Transition Feedback'}
              </h3>
              <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                {isDemo ? 'Send client demo specifications directly to Admin' : 'Record conversation notes for this status change'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            style={{
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.35rem' }}>
          {/* Lead Context Pill */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E6E9EE',
              borderRadius: '8px',
              padding: '0.75rem 0.9rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#111827' }}>{lead.name}</strong>
              <span className="num" style={{ fontSize: '0.76rem', color: '#6B7280' }}>{lead.phone}</span>
            </div>
            {lead.lead_company && (
              <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '4px' }}>
                {lead.lead_company}
              </div>
            )}

            {/* Stage Transition Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.74rem' }}>
              <span
                style={{
                  backgroundColor: '#F1F3F6',
                  color: '#4B5563',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
              >
                {currentStatusLabel}
              </span>
              <ArrowRight size={13} color="#9CA3AF" />
              <span
                style={{
                  backgroundColor: '#FFF3E6',
                  color: '#B65807',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: '700',
                  textTransform: 'capitalize',
                }}
              >
                {nextLabel}
              </span>
            </div>
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.6rem 0.8rem',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                borderRadius: '6px',
                fontSize: '0.78rem',
                marginBottom: '1rem',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Feedback Input */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
              <label
                style={{
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  color: '#374151',
                  margin: 0,
                }}
              >
                {isDemo ? 'Demo Website / Requirements Details' : 'Feedback / Discussion Notes'} <span style={{ color: '#DC2626' }}>*</span>
              </label>

              {/* Voice-to-Text Shortcut Badge */}
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#1D667C',
                  backgroundColor: '#E8F6FA',
                  border: '1px solid #BEE1EB',
                  padding: '2px 8px',
                  borderRadius: '5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: '600',
                }}
                title="Press Win + H on your keyboard to speak into mic"
              >
                <Mic size={11} color="#2A9CB8" />
                <span>Voice-to-Text: Press <kbd style={{ padding: '1px 5px', backgroundColor: '#fff', border: '1px solid #BEE1EB', borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.68rem', fontWeight: '800', color: '#1D667C' }}>Win + H</kbd> for Mic</span>
              </span>
            </div>

            <textarea
              autoFocus
              rows={4}
              required
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={
                isDemo
                  ? 'e.g. Client requested a demo website for Real Estate agency with property search, WhatsApp chat button, and brochure download. Reference: https://example.com'
                  : 'e.g. Discussed mobile app scope, client budget is around ₹25,000, requested follow-up tomorrow at 4 PM...'
              }
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                fontSize: '0.82rem',
                lineHeight: '1.45',
                borderRadius: '8px',
                border: '1px solid #E6E9EE',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="btn-secondary-action"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy || !feedback.trim()}
              className="btn-primary-action"
            >
              <CheckCircle2 size={14} />
              <span>{isBusy ? 'Saving…' : (isDemo ? 'Submit Demo Request' : 'Save & Update Stage')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
