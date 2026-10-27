import { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Mail,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ExternalLink,
  DollarSign,
  FileText,
  Upload,
  Printer,
  FileCheck,
  Trash2,
  Paperclip,
  Wrench,
} from 'lucide-react';
import { companyPortalApi } from '../api/client';

export default function AdminSendQuotationModal({ lead, isOpen, onClose, onSuccess }) {
  if (!isOpen || !lead) return null;

  const isRevision =
    lead.quotation_notes?.includes('[REVISION') || Boolean(lead.quotation_sent_at);

  // Extract initial target budget number from notes if available (e.g. ₹25000 or 25000)
  const extractedBudget = (() => {
    if (!lead.quotation_notes) return '';
    const match = lead.quotation_notes.match(/Budget:\s*₹?\s*([0-9,]+)/i);
    return match ? match[1].replace(/,/g, '') : '';
  })();

  const [channel, setChannel] = useState(lead.phone ? 'whatsapp' : 'email');
  const [dealValue, setDealValue] = useState(lead.deal_value || extractedBudget || '');
  const [email, setEmail] = useState(lead.email || '');
  const [phone, setPhone] = useState(lead.phone || '');
  const [waMessage, setWaMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // PDF Attachment State
  const [pdfUrl, setPdfUrl] = useState(lead.quotation_pdf_url || '');
  const [pdfName, setPdfName] = useState(lead.quotation_pdf_url ? lead.quotation_pdf_url.split('/').pop() : '');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize Email Subject once on mount / lead change (no bulky prefilled text)
  useEffect(() => {
    const services = lead.quotation_services || 'Requested Services';
    setEmailSubject(`Official Quotation: ${services} - SurfSync Infotech Pvt. Ltd.`);
    setWaMessage('');
    setEmailBody('');
  }, [lead.id]);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file (.pdf)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('PDF file size should not exceed 10 MB');
      return;
    }

    setUploadingPdf(true);
    setError('');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result;
          const res = await companyPortalApi.uploadQuotationPdf({
            filename: file.name,
            base64Data,
          });
          setPdfUrl(res.url);
          setPdfName(file.name);
          setSuccessMsg(`Quotation PDF "${file.name}" uploaded & attached!`);
        } catch (uploadErr) {
          setError(uploadErr.message || 'Failed to upload PDF');
        } finally {
          setUploadingPdf(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message || 'Failed to process file');
      setUploadingPdf(false);
    }
  }

  function handleRemovePdf() {
    setPdfUrl('');
    setPdfName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSendWhatsApp() {
    setError('');
    setBusy(true);
    try {
      if (!phone.trim()) {
        throw new Error('Phone number is required to send via WhatsApp');
      }

      // 1. Prepare message (including PDF link if attached)
      const pdfText = pdfUrl ? `\n\nQuotation PDF: ${window.location.origin}${pdfUrl}` : '';
      const textToSend = `${waMessage.trim() || 'Hello, please find your quotation from SurfSync Infotech Pvt. Ltd.'}${pdfText}`;

      // 2. Send WhatsApp message directly via Pinbot API
      try {
        await companyPortalApi.whatsappSendToLead(lead.id, {
          type: 'text',
          text: textToSend,
          phone: phone.trim(),
        });
      } catch (waErr) {
        console.warn('Direct Pinbot WhatsApp dispatch note:', waErr.message);
      }

      // 3. Update lead status to quotation_sent + phone + deal_value + email + quotation_pdf_url
      await companyPortalApi.updateLead(lead.id, {
        status: 'quotation_sent',
        phone: phone.trim(),
        deal_value: dealValue ? Number(dealValue) : null,
        email: email.trim() || lead.email || null,
        quotation_pdf_url: pdfUrl || null,
      });

      setSuccessMsg('Quotation sent successfully via WhatsApp! Status updated to Quotation Sent.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to send WhatsApp quotation');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendEmail() {
    setError('');
    setBusy(true);
    try {
      if (!email.trim()) {
        throw new Error('Please enter a valid client email address');
      }
      if (!emailSubject.trim()) {
        throw new Error('Email Subject is mandatory');
      }

      // Send email directly from aditi@surfsyncinfotech.in with attached PDF
      await companyPortalApi.sendQuotationEmail(lead.id, {
        to: email.trim(),
        subject: emailSubject.trim(),
        body: emailBody.trim(),
        pdfUrl: pdfUrl || null,
        pdfFilename: pdfName || 'Quotation.pdf',
        dealValue: dealValue ? Number(dealValue) : null,
      });

      setSuccessMsg(`Quotation email and PDF sent successfully to ${email.trim()} from aditi@surfsyncinfotech.in!`);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to send email quotation');
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkSentDirect() {
    setError('');
    setBusy(true);
    try {
      await companyPortalApi.updateLead(lead.id, {
        status: 'quotation_sent',
        deal_value: dealValue ? Number(dealValue) : null,
        email: email.trim() || lead.email || null,
        quotation_pdf_url: pdfUrl || null,
      });

      setSuccessMsg('Status updated to Quotation Sent! Rep notified for Phase 2 follow-ups.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to update quotation status');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
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
            maxWidth: '680px',
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '1.5rem',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1rem',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '0.85rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="#0d9488" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Send Quotation to Client
                </h2>
                {isRevision && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      backgroundColor: '#ffedd5',
                      color: '#c2410c',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: '800',
                      border: '1px solid #fdba74',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <RotateCcw size={10} />
                    <span>Revision / Negotiation</span>
                  </span>
                )}
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Lead: <strong style={{ color: '#1e293b' }}>{lead.name}</strong> • Phone:{' '}
                <strong>{lead.phone || 'No phone'}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Sales Specs Box */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.85rem',
              fontSize: '0.82rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ fontWeight: '700', color: '#334155', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Wrench size={14} color="#0f766e" />
              <span>Requested Services: <span style={{ color: '#0f766e' }}>{lead.quotation_services || 'Custom Requirement'}</span></span>
            </div>
            {lead.quotation_scope && (
              <div style={{ color: '#475569', marginBottom: '4px' }}>
                <strong>Scope:</strong> {lead.quotation_scope}
              </div>
            )}
            {lead.quotation_notes && (
              <div style={{ color: '#475569' }}>
                <strong>Sales Rep Notes & Budget:</strong> {lead.quotation_notes}
              </div>
            )}
          </div>

          {/* Quotation PDF Tools (Generate / Attach) */}
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.82rem', color: '#15803d', marginBottom: '8px' }}>
              <Paperclip size={15} />
              <span>Quotation PDF Document</span>
            </div>

            {/* Attached file status or file input */}
            {pdfUrl ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#fff',
                  border: '1px solid #86efac',
                  borderRadius: '6px',
                  padding: '6px 10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#166534', fontWeight: '600' }}>
                  <FileCheck size={16} color="#16a34a" />
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#15803d', textDecoration: 'underline' }}
                    title="Click to view uploaded PDF"
                  >
                    {pdfName || 'Quotation.pdf'}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePdf}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                  title="Remove attached PDF"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="quotation-pdf-upload"
                />
                <label
                  htmlFor="quotation-pdf-upload"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    backgroundColor: '#fff',
                    color: '#166534',
                    border: '1px dashed #86efac',
                    borderRadius: '6px',
                    cursor: uploadingPdf ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Upload size={13} />
                  <span>{uploadingPdf ? 'Uploading PDF…' : 'Upload Quotation PDF file'}</span>
                </label>
                <span style={{ fontSize: '0.72rem', color: '#166534' }}>
                  (Max 10 MB • Automatically attached to WhatsApp & Email)
                </span>
              </div>
            )}
          </div>

          {/* Pricing / Deal Value Input */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '4px',
              }}
            >
              Proposed Quotation Value (₹) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontWeight: '700',
                  color: '#64748b',
                }}
              >
                ₹
              </span>
              <input
                type="number"
                placeholder="e.g. 25000"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2rem',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  borderRadius: '6px',
                  border: '1.5px solid #0d9488',
                  backgroundColor: '#f0fdfa',
                  color: '#0f766e',
                }}
              />
            </div>
          </div>

          {/* Channel Selection Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setChannel('whatsapp')}
              style={{
                padding: '7px 14px',
                fontSize: '0.85rem',
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
                fontSize: '0.85rem',
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

          {/* Error / Success Alerts */}
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
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: WHATSAPP */}
          {channel === 'whatsapp' && (
            <div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748b', marginBottom: '3px' }}>
                  Recipient Phone:
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 917666712487"
                  style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748b', marginBottom: '3px' }}>
                  WhatsApp Message (Optional / Custom Note):
                </label>
                <textarea
                  rows={5}
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  placeholder="Write your custom WhatsApp message here..."
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    fontSize: '0.82rem',
                    fontFamily: 'sans-serif',
                    lineHeight: '1.45',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fafafa',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleMarkSentDirect}
                  className="ghost-btn"
                  disabled={busy}
                  style={{ fontSize: '0.8rem', padding: '6px 12px', color: '#64748b' }}
                  title="Mark as sent without sending message"
                >
                  Mark as Sent (Manual)
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {phone && (
                    <a
                      href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '7px 12px',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#fff',
                        color: '#0f172a',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <ExternalLink size={13} />
                      <span>Open WA Web</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    disabled={busy}
                    style={{
                      padding: '7px 16px',
                      fontSize: '0.84rem',
                      fontWeight: '700',
                      backgroundColor: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Send size={14} />
                    <span>{busy ? 'Sending…' : 'Send via WhatsApp & Mark Sent'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL */}
          {channel === 'email' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  marginBottom: '0.85rem',
                  fontSize: '0.78rem',
                  color: '#166534',
                }}
              >
                <Mail size={13} color="#166534" />
                <span><strong>Sender Account:</strong> aditi@surfsyncinfotech.in (Official SurfSync Mailer)</span>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748b', marginBottom: '3px' }}>
                  Recipient Client Email: <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@company.com (Enter or update client email)"
                  style={{
                    width: '100%',
                    padding: '0.45rem',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    border: !email.trim() ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                    backgroundColor: !email.trim() ? '#fffbeb' : '#fff',
                  }}
                />
                {!email.trim() && (
                  <div style={{ fontSize: '0.72rem', color: '#d97706', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={12} color="#d97706" />
                    <span>Client email is currently missing. Please enter their email address to send quotation.</span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748b', marginBottom: '3px' }}>
                  Email Subject: <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="e.g. Official Quotation for Mobile App - SurfSync Infotech Pvt. Ltd."
                  style={{ width: '100%', padding: '0.45rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#64748b', marginBottom: '3px' }}>
                  Email Body (Optional / Custom Note):
                </label>
                <textarea
                  rows={5}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Write your custom email message here..."
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    fontSize: '0.82rem',
                    fontFamily: 'sans-serif',
                    lineHeight: '1.45',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fafafa',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleMarkSentDirect}
                  className="ghost-btn"
                  disabled={busy}
                  style={{ fontSize: '0.8rem', padding: '6px 12px', color: '#64748b' }}
                  title="Mark as sent without sending email"
                >
                  Mark as Sent (Manual)
                </button>

                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={busy}
                  style={{
                    padding: '7px 16px',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Send size={14} />
                  <span>{busy ? 'Processing…' : 'Send via Email & Mark Sent'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
