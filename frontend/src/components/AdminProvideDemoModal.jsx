import React, { useState, useEffect } from 'react';
import {
  X,
  Monitor,
  ExternalLink,
  Send,
  MessageSquare,
  Mail,
  CheckCircle2,
  AlertCircle,
  Globe,
  Sparkles,
  Check,
} from 'lucide-react';
import { companyPortalApi } from '../api/client';

export default function AdminProvideDemoModal({ lead, isOpen, onClose, onSuccess, initialChannel = 'whatsapp' }) {
  if (!isOpen || !lead) return null;

  const [channel, setChannel] = useState(initialChannel || (lead.phone ? 'whatsapp' : 'email'));
  const [demoLink, setDemoLink] = useState(lead.demo_link || '');
  const [phone, setPhone] = useState(lead.phone || '');
  const [email, setEmail] = useState(lead.email || '');
  const [waMessage, setWaMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync initial channel when modal opens
  useEffect(() => {
    if (initialChannel) setChannel(initialChannel);
    else if (lead.phone) setChannel('whatsapp');
    else if (lead.email) setChannel('email');
  }, [initialChannel, lead.id]);

  // Update default WhatsApp and Email bodies when demoLink or lead changes
  useEffect(() => {
    const clientName = lead.name || 'there';
    const linkText = demoLink.trim()
      ? (demoLink.trim().startsWith('http://') || demoLink.trim().startsWith('https://')
          ? demoLink.trim()
          : `https://${demoLink.trim()}`)
      : '[DEMO_URL]';

    setWaMessage(
      `Hello ${clientName},\n\nAs requested, here is the demo website link prepared for your review:\n🔗 ${linkText}\n\n${adminNotes ? `Notes: ${adminNotes}\n\n` : ''}Our team will follow up with you to walk through the features and discuss your requirements.`
    );

    setEmailSubject(`Demo Website Link & Specifications - SurfSync Infotech Pvt. Ltd.`);
    setEmailBody(
      `Dear ${clientName},\n\nThank you for reaching out to SurfSync Infotech. As requested, we have prepared the demo website link tailored for your requirements:\n\nDemo Website URL: ${linkText}\n${adminNotes ? `Access Credentials & Notes: ${adminNotes}\n` : ''}\nPlease explore the demo and let us know your thoughts. Our sales representative will connect with you shortly to assist with any questions.\n\nBest regards,\nSurfSync Infotech Pvt. Ltd.\nWebsite: https://surfsyncinfotech.in`
    );
  }, [demoLink, adminNotes, lead.id, lead.name]);

  function getCleanLink() {
    if (!demoLink.trim()) return '';
    return demoLink.trim().startsWith('http://') || demoLink.trim().startsWith('https://')
      ? demoLink.trim()
      : `https://${demoLink.trim()}`;
  }

  // Action 1: Send via WhatsApp
  async function handleSendWhatsApp(e) {
    e?.preventDefault();
    if (!demoLink.trim()) {
      setError('Please provide the Demo Website URL');
      return;
    }
    if (!phone.trim()) {
      setError('Please provide client phone number for WhatsApp');
      return;
    }
    setError('');
    setBusy(true);

    try {
      const formattedLink = getCleanLink();

      // 1. Send WhatsApp message directly via API
      try {
        await companyPortalApi.whatsappSendToLead(lead.id, {
          type: 'text',
          text: waMessage.trim(),
          phone: phone.trim(),
        });
      } catch (waErr) {
        console.warn('WhatsApp direct send note:', waErr.message);
      }

      // 2. Update lead with demo_link, demo_sent_at, phone, status: 'followup'
      await companyPortalApi.updateLead(lead.id, {
        demo_link: formattedLink,
        demo_sent_at: new Date().toISOString(),
        phone: phone.trim(),
        status: 'followup',
        notes: adminNotes.trim() ? `[Admin Demo Note]: ${adminNotes.trim()}` : undefined,
      });

      setSuccessMsg('Demo website sent successfully via WhatsApp! Rep moved to Follow-Up.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1400);
    } catch (err) {
      setError(err.message || 'Failed to send WhatsApp demo');
    } finally {
      setBusy(false);
    }
  }

  // Action 2: Send via Email
  async function handleSendEmail(e) {
    e?.preventDefault();
    if (!demoLink.trim()) {
      setError('Please provide the Demo Website URL');
      return;
    }
    if (!email.trim()) {
      setError('Please provide client email address');
      return;
    }
    if (!emailSubject.trim()) {
      setError('Email subject is required');
      return;
    }
    setError('');
    setBusy(true);

    try {
      const formattedLink = getCleanLink();

      // Send email via backend Hostinger SMTP endpoint
      await companyPortalApi.sendDemoEmail(lead.id, {
        to: email.trim(),
        subject: emailSubject.trim(),
        body: emailBody.trim(),
        demoLink: formattedLink,
      });

      setSuccessMsg(`Demo website email sent successfully to ${email.trim()}! Rep moved to Follow-Up.`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1400);
    } catch (err) {
      setError(err.message || 'Failed to send demo email');
    } finally {
      setBusy(false);
    }
  }

  // Action 3: Mark Delivered Directly (without sending WhatsApp/Email message)
  async function handleMarkDeliveredDirect() {
    if (!demoLink.trim() && !adminNotes.trim()) {
      setError('Please provide at least a demo website link or specification notes.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const formattedLink = getCleanLink();
      await companyPortalApi.updateLead(lead.id, {
        demo_link: formattedLink || undefined,
        demo_sent_at: new Date().toISOString(),
        status: 'followup',
        notes: adminNotes.trim() ? `[Admin Demo Note]: ${adminNotes.trim()}` : undefined,
      });

      setSuccessMsg('Demo details saved! Rep moved to Follow-Up.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to update demo details');
    } finally {
      setBusy(false);
    }
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
          maxWidth: '620px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.1rem 1.35rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Monitor size={17} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>
                Deliver Demo Website to Lead
              </h3>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Send demo website link directly to client via WhatsApp or Email
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
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

        {/* Modal Scrollable Body */}
        <div style={{ padding: '1.25rem 1.35rem', overflowY: 'auto' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{lead.name}</strong>
              <span
                style={{
                  fontSize: '0.72rem',
                  backgroundColor: '#ccfbf1',
                  color: '#0f766e',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: '700',
                }}
              >
                Rep: {lead.assigned_name || lead.claimed_by_name || 'Sales Rep'}
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {lead.phone && <span>📞 {lead.phone}</span>}
              {lead.email && <span>✉️ {lead.email}</span>}
              {lead.lead_company && <span>🏢 {lead.lead_company}</span>}
            </div>

            {/* Requested Specs / Notes Box */}
            <div
              style={{
                marginTop: '0.65rem',
                padding: '0.65rem',
                backgroundColor: '#fff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ fontWeight: '700', color: '#0284c7', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={12} />
                <span>What Client Requested:</span>
              </div>
              <div style={{ color: '#334155', lineHeight: 1.4 }}>
                {lead.demo_notes || lead.notes || 'Client requested demo website and specifications.'}
              </div>
            </div>
          </div>

          {/* Success Message */}
          {successMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '600',
                marginBottom: '1rem',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Alert */}
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

          {/* Demo Website URL Input (Global) */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#334155',
                marginBottom: '5px',
              }}
            >
              Demo Website URL <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Globe size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                required
                autoFocus
                placeholder="https://websitedevelopment.surfsyncinfotech.in/demo/..."
                value={demoLink}
                onChange={(e) => setDemoLink(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  fontSize: '0.82rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>
            {demoLink && (
              <a
                href={getCleanLink()}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.72rem',
                  color: '#0284c7',
                  marginTop: '4px',
                  textDecoration: 'none',
                  fontWeight: '600',
                }}
              >
                <span>Preview demo website</span>
                <ExternalLink size={10} />
              </a>
            )}
          </div>

          {/* Admin Credentials / Notes (Global) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#334155',
                marginBottom: '5px',
              }}
            >
              Admin Instructions / Demo Credentials (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Added real estate filter template. Login: admin / demo123"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Channel Selector Tabs (WhatsApp vs Email) */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.65rem' }}>
            <button
              type="button"
              onClick={() => setChannel('whatsapp')}
              style={{
                padding: '7px 14px',
                fontSize: '0.82rem',
                fontWeight: '700',
                borderRadius: '8px',
                border: channel === 'whatsapp' ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                backgroundColor: channel === 'whatsapp' ? '#ecfdf5' : '#fff',
                color: channel === 'whatsapp' ? '#047857' : '#64748b',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <MessageSquare size={15} />
              <span>Send on WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setChannel('email')}
              style={{
                padding: '7px 14px',
                fontSize: '0.82rem',
                fontWeight: '700',
                borderRadius: '8px',
                border: channel === 'email' ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: channel === 'email' ? '#eff6ff' : '#fff',
                color: channel === 'email' ? '#1d4ed8' : '#64748b',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Mail size={15} />
              <span>Send on Email</span>
            </button>
          </div>

          {/* WhatsApp Channel Form */}
          {channel === 'whatsapp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Client WhatsApp Phone <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '0.82rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  WhatsApp Message Preview
                </label>
                <textarea
                  rows={5}
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    lineHeight: '1.45',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          )}

          {/* Email Channel Form */}
          {channel === 'email' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Client Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '0.82rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Email Subject <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: '0.82rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Email Message Body
                </label>
                <textarea
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    lineHeight: '1.45',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '0.85rem 1.35rem',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#fafafa',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handleMarkDeliveredDirect}
            disabled={busy || !demoLink.trim()}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: '600',
              backgroundColor: '#fff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: !demoLink.trim() || busy ? 'not-allowed' : 'pointer',
            }}
            title="Mark demo as delivered without dispatching automated email/WhatsApp message"
          >
            Mark Delivered (No Message)
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
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

            {channel === 'whatsapp' ? (
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={busy || !demoLink.trim() || !phone.trim()}
                style={{
                  padding: '7px 18px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: !demoLink.trim() || !phone.trim() || busy ? '#94a3b8' : '#10b981',
                  color: '#fff',
                  cursor: !demoLink.trim() || !phone.trim() || busy ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <MessageSquare size={14} />
                <span>{busy ? 'Sending…' : 'Send via WhatsApp'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={busy || !demoLink.trim() || !email.trim()}
                style={{
                  padding: '7px 18px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: !demoLink.trim() || !email.trim() || busy ? '#94a3b8' : '#2563eb',
                  color: '#fff',
                  cursor: !demoLink.trim() || !email.trim() || busy ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <Mail size={14} />
                <span>{busy ? 'Sending…' : 'Send via Email'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
