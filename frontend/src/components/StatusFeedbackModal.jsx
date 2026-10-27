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
}) {
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !lead) return null;

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.1rem 1.35rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fafafa',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: isDemo ? '#e0f2fe' : '#ecfdf5',
                color: isDemo ? '#0284c7' : '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isDemo ? <Monitor size={17} /> : <MessageSquareText size={17} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '800', color: '#0f172a' }}>
                {isDemo ? 'Demo Website & Details Request' : 'Stage Feedback Required'}
              </h3>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                {isDemo ? 'Send client demo specifications directly to Admin' : 'Please record call / client notes for this update'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
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
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.75rem 0.9rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{lead.name}</strong>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{lead.phone}</span>
            </div>
            {lead.lead_company && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>
                Company: {lead.lead_company}
              </div>
            )}

            {/* Stage Transition Banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.74rem' }}>
              <span
                style={{
                  backgroundColor: '#e2e8f0',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
              >
                {currentStatusLabel}
              </span>
              <ArrowRight size={13} color="#94a3b8" />
              <span
                style={{
                  backgroundColor: '#dbeafe',
                  color: '#1d4ed8',
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
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
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
                  color: '#334155',
                  margin: 0,
                }}
              >
                {isDemo ? 'Demo Website / Requirements Details' : 'Feedback / Discussion Notes'} <span style={{ color: '#ef4444' }}>*</span>
              </label>

              {/* Voice-to-Text Shortcut Badge */}
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
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b', marginTop: '5px', flexWrap: 'wrap', gap: '4px' }}>
              <span>
                {isDemo
                  ? 'These details will be queued in the Admin Quotes & Demos dashboard for fulfillment.'
                  : 'This feedback will be stored in the permanent lead feedback timeline.'}
              </span>
              <span style={{ color: '#0f766e', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                🎙️ You can use keyboard shortcut <kbd style={{ padding: '1px 5px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '3px', fontFamily: 'monospace', fontSize: '0.68rem', color: '#0f172a', fontWeight: '700' }}>Win + H</kbd> for mic voice typing
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '7px 14px',
                fontSize: '0.82rem',
                fontWeight: '600',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#fff',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !feedback.trim()}
              style={{
                padding: '7px 18px',
                fontSize: '0.82rem',
                fontWeight: '700',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: !feedback.trim() ? '#94a3b8' : (isDemo ? '#0284c7' : '#059669'),
                color: '#fff',
                cursor: !feedback.trim() || isSubmitting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <CheckCircle2 size={14} />
              <span>{isSubmitting ? 'Saving…' : (isDemo ? 'Submit Demo Request to Admin' : 'Save Feedback & Update Stage')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
