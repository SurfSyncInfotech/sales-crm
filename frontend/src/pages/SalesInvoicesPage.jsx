import { useEffect, useState, useRef } from 'react';
import { salesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ReceiptText,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Printer,
  Share2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  IndianRupee,
  Trash2,
  X,
  ExternalLink,
  ShieldCheck,
  Check,
  Sparkles,
} from 'lucide-react';

// Number to Indian Words Helper
function numberToIndianWords(num) {
  const nVal = Math.round(Number(num) || 0);
  if (nVal === 0) return 'Zero Rupees';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + nVal).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return `${nVal} Rupees`;
  let str = '';
  str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' Crore ' : '';
  str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' Lakh ' : '';
  str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + ' Thousand ' : '';
  str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + ' Hundred ' : '';
  str += Number(n[5]) !== 0 ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim() + ' Rupees';
}

function formatCurrency(val) {
  const n = Number(val) || 0;
  return '₹ ' + n.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
}

export default function SalesInvoicesPage() {
  const { user } = useAuth('sales');

  const [activeTab, setActiveTab] = useState('won_leads'); // 'won_leads' | 'invoices'
  const [wonLeads, setWonLeads] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State: Create Invoice
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [formData, setFormData] = useState({
    lead_id: '',
    client_name: '',
    client_phone: '',
    client_email: '',
    place_of_supply: 'Bihar',
    service_name: 'AI AVATAR GENERATION APP',
    sac_code: '8965',
    rate: '93432.2',
    tax_percent: '18',
    is_interstate: false,
    received_amount: '33075',
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    terms: `1. Payment must be made within the due date mentioned on the invoice.\n2. Deliverables, source code, and ownership rights will be transferred only after full payment is received.\n3. Any work beyond the agreed scope shall be charged additionally.\n4. Payments once made are non-refundable.\n5. All disputes shall be subject to the jurisdiction of Patna, Bihar.`,
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal State: View / Print Invoice
  const [viewInvoiceModalOpen, setViewInvoiceModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Load Data
  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [leadsRes, invRes] = await Promise.all([
        salesApi.wonLeads(),
        salesApi.invoices(),
      ]);
      setWonLeads(leadsRes.won_leads || []);
      setInvoices(invRes.invoices || []);
    } catch (err) {
      setError(err.message || 'Failed to load invoices and won leads');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Open Create Invoice for a specific won lead
  function handleOpenCreate(lead) {
    setSelectedLead(lead);
    const initialRate = lead.deal_value ? String(lead.deal_value) : '93432.2';
    const initialService = lead.quotation_services || (lead.lead_company ? `${lead.lead_company} - Project Development` : 'AI AVATAR GENERATION APP');

    setFormData({
      lead_id: lead.id,
      client_name: lead.name || '',
      client_phone: lead.phone || '',
      client_email: lead.email || '',
      place_of_supply: 'Bihar',
      service_name: initialService,
      sac_code: '8965',
      rate: initialRate,
      tax_percent: '18',
      is_interstate: false,
      received_amount: '0',
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      terms: `1. Payment must be made within the due date mentioned on the invoice.\n2. Deliverables, source code, and ownership rights will be transferred only after full payment is received.\n3. Any work beyond the agreed scope shall be charged additionally.\n4. Payments once made are non-refundable.\n5. All disputes shall be subject to the jurisdiction of Patna, Bihar.`,
    });
    setCreateModalOpen(true);
  }

  // Calculate invoice live summary
  const baseRate = parseFloat(formData.rate) || 0;
  const taxPct = parseFloat(formData.tax_percent) || 18;
  const taxAmount = Math.round((baseRate * (taxPct / 100)) * 100) / 100;
  const totalAmount = Math.round((baseRate + taxAmount) * 100) / 100;
  const receivedAmt = parseFloat(formData.received_amount) || 0;
  const balanceAmount = Math.max(0, Math.round((totalAmount - receivedAmt) * 100) / 100);
  const cgstAmount = formData.is_interstate ? 0 : Math.round((taxAmount / 2) * 100) / 100;
  const sgstAmount = formData.is_interstate ? 0 : Math.round((taxAmount - cgstAmount) * 100) / 100;
  const igstAmount = formData.is_interstate ? taxAmount : 0;
  const amountInWords = numberToIndianWords(totalAmount);

  // Submit invoice creation
  async function handleCreateInvoice(e) {
    e.preventDefault();
    if (!formData.lead_id) {
      alert('Please select a won lead');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        lead_id: formData.lead_id,
        client_name: formData.client_name.trim(),
        client_phone: formData.client_phone.trim(),
        client_email: formData.client_email.trim(),
        place_of_supply: formData.place_of_supply.trim(),
        service_name: formData.service_name.trim(),
        sac_code: formData.sac_code.trim(),
        rate: baseRate,
        tax_percent: taxPct,
        is_interstate: formData.is_interstate,
        received_amount: receivedAmt,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        terms: formData.terms,
      };

      const res = await salesApi.createInvoice(payload);
      setSuccessMsg(res.message || 'Invoice created successfully!');
      setCreateModalOpen(false);

      // Open the newly created invoice immediately in preview/print view!
      if (res.invoice) {
        setActiveInvoice(res.invoice);
        setViewInvoiceModalOpen(true);
      }

      await loadData();
      setActiveTab('invoices');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  }

  // Delete invoice
  async function handleDeleteInvoice(inv) {
    if (!window.confirm(`Are you sure you want to delete Invoice #${inv.invoice_no}?`)) {
      return;
    }
    setDeletingId(inv.id);
    try {
      await salesApi.deleteInvoice(inv.id);
      setSuccessMsg(`Invoice #${inv.invoice_no} deleted.`);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete invoice');
    } finally {
      setDeletingId(null);
    }
  }

  // Filtered lists
  const filteredWonLeads = wonLeads.filter((l) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      l.name?.toLowerCase().includes(term) ||
      l.phone?.includes(term) ||
      l.email?.toLowerCase().includes(term) ||
      l.lead_company?.toLowerCase().includes(term)
    );
  });

  const filteredInvoices = invoices.filter((inv) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      inv.invoice_no?.toString().toLowerCase().includes(term) ||
      inv.client_name?.toLowerCase().includes(term) ||
      inv.client_phone?.includes(term) ||
      inv.service_name?.toLowerCase().includes(term)
    );
  });

  function handleShareWhatsApp(inv) {
    const phone = (inv.client_phone || '').replace(/\D/g, '');
    const msg = `*TAX INVOICE - SURFSYNC INFOTECH PVT. LTD.*%0A%0A*Invoice No:* ${inv.invoice_no}%0A*Date:* ${formatDate(inv.invoice_date)}%0A*Bill To:* ${inv.client_name}%0A*Service:* ${inv.service_name}%0A*Total Amount:* ₹ ${Number(inv.total_amount).toLocaleString('en-IN')}%0A*Received Amount:* ₹ ${Number(inv.received_amount).toLocaleString('en-IN')}%0A*Balance Due:* ₹ ${Number(inv.balance_amount).toLocaleString('en-IN')}%0A%0A*Bank Details:*%0AName: SURFSYNC INFOTECH PVT. LTD%0ABank: State Bank of India, LAL GANJ%0AA/C No: 45182936194%0AIFSC Code: SBIN0001483%0A%0AThank you for your business!`;
    const url = phone ? `https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="sales-invoices-page">
      {/* Scoped CSS ensuring Manrope Font, CRM theme, Responsiveness, and Print layout */}
      <style>{`
        .sales-invoices-page,
        .sales-invoices-page * {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          box-sizing: border-box;
        }
        .sales-invoices-page {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 24px;
        }

        /* Desktop vs Mobile Table switch */
        .inv-table-desktop {
          display: block;
        }
        .inv-cards-mobile {
          display: none;
        }

        @media (max-width: 899px) {
          .sales-invoices-page {
            padding: 14px;
            gap: 16px;
          }
          .inv-table-desktop {
            display: none !important;
          }
          .inv-cards-mobile {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
          }
          .inv-header-wrap {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .inv-filter-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .inv-filter-tools {
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100% !important;
          }
          .inv-filter-tools > * {
            width: 100% !important;
          }
        }

        /* Print Media Styles: Only print the invoice document cleanly on A4 paper */
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice-document,
          #printable-invoice-document * {
            visibility: visible;
          }
          #printable-invoice-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* 1. Header Matching Sales CRM Theme */}
      <div className="inv-header-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
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
              color: '#F68713',
              marginBottom: '4px',
            }}
          >
            <span>Sales Operations</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>Billing & Invoicing</span>
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#111827',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
            }}
          >
            Invoice Management
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
            Generate official GST Tax Invoices strictly for Won Deals. Auto-calculate taxes, bank details, and share directly via WhatsApp.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '9px',
              border: '1px solid #E6E9EE',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '8px', color: '#166534', fontSize: '13px', fontWeight: 700 }}>
          ✓ {successMsg}
        </div>
      )}

      {/* 2. Segmented Tabs (.lead-tabs) */}
      <div className="lead-tabs" style={{ display: 'inline-flex', gap: '4px', background: '#F1F4F9', padding: '4px', borderRadius: '10px', border: '1px solid #E6E9EE', width: 'fit-content' }}>
        <button
          type="button"
          onClick={() => setActiveTab('won_leads')}
          style={{
            border: 'none',
            background: activeTab === 'won_leads' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'won_leads' ? '#111827' : '#6B7280',
            boxShadow: activeTab === 'won_leads' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Won Deals Ready for Invoice ({wonLeads.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          style={{
            border: 'none',
            background: activeTab === 'invoices' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'invoices' ? '#111827' : '#6B7280',
            boxShadow: activeTab === 'invoices' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Generated Invoices ({invoices.length})
        </button>
      </div>

      {/* 3. High-Density Filter Toolbar */}
      <div
        className="inv-filter-bar"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0 }}>
            {activeTab === 'won_leads' ? 'Won Leads Directory' : 'All Generated Invoices'}
          </h2>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: '#F3F4F6',
              color: '#4B5563',
              padding: '2px 8px',
              borderRadius: '999px',
            }}
          >
            {activeTab === 'won_leads' ? `${filteredWonLeads.length} won leads` : `${filteredInvoices.length} invoices`}
          </span>
        </div>

        <div className="inv-filter-tools" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder={activeTab === 'won_leads' ? 'Search by lead name, phone, company…' : 'Search by invoice #, client, service…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                height: '36px',
                padding: '0 12px 0 32px',
                fontSize: '13px',
                border: '1px solid #E6E9EE',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                outline: 'none',
                minWidth: '260px',
              }}
            />
          </div>
        </div>
      </div>

      {/* 4. TAB 1: WON LEADS READY FOR INVOICE */}
      {activeTab === 'won_leads' && (
        <>
          {/* Desktop Table View */}
          <div
            className="inv-table-desktop"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E9EE',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderBottom: '1px solid #E6E9EE',
                    color: '#6B7280',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '12px 16px' }}>LEAD ID & NAME</th>
                  <th style={{ padding: '12px 16px' }}>PHONE & EMAIL</th>
                  <th style={{ padding: '12px 16px' }}>COMPANY</th>
                  <th style={{ padding: '12px 16px' }}>DEAL VALUE</th>
                  <th style={{ padding: '12px 16px' }}>WON STATUS</th>
                  <th style={{ padding: '12px 16px' }}>INVOICE STATUS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredWonLeads.map((lead) => {
                  const hasInvoice = lead.invoice_count > 0;
                  return (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#111827' }}>
                        <div>{lead.name}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>LID-{lead.id}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{lead.phone || '—'}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280' }}>{lead.email || '—'}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#374151' }}>
                        {lead.lead_company || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#111827' }}>
                        {lead.deal_value ? formatCurrency(lead.deal_value) : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#DCFCE7',
                            color: '#166534',
                            border: '1px solid #BBF7D0',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
                          Won Deal
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {hasInvoice ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: '#E8F6FA',
                              color: '#2A9CB8',
                              border: '1px solid #B8E3ED',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            ✓ Inv #{lead.last_invoice_no} ({lead.invoice_count})
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Ready for invoice</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenCreate(lead)}
                          style={{
                            height: '34px',
                            padding: '0 14px',
                            borderRadius: '7px',
                            backgroundColor: '#F68713',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(246,135,19,0.25)',
                          }}
                        >
                          <Plus size={13} />
                          <span>Create Invoice</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredWonLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#9CA3AF' }}>
                      <ReceiptText size={36} style={{ margin: '0 auto 10px auto', opacity: 0.35, color: '#F68713' }} />
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#374151' }}>No won leads available</div>
                      <div style={{ fontSize: '12px', marginTop: '4px', color: '#9CA3AF' }}>
                        Invoices can only be created for deals marked as Won in your Sales Pipeline.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="inv-cards-mobile">
            {filteredWonLeads.map((lead) => {
              const hasInvoice = lead.invoice_count > 0;
              return (
                <div
                  key={lead.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E6E9EE',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: '#111827' }}>{lead.name}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>LID-{lead.id} • {lead.lead_company || 'No Company'}</div>
                    </div>
                    <span
                      style={{
                        backgroundColor: '#DCFCE7',
                        color: '#166534',
                        border: '1px solid #BBF7D0',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      Won Deal
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: '#374151', backgroundColor: '#F9FAFB', padding: '10px 12px', borderRadius: '8px' }}>
                    {lead.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} color="#F68713" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    {lead.deal_value && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <span>Deal: {formatCurrency(lead.deal_value)}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F4F6', paddingTop: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      {hasInvoice ? `Inv #${lead.last_invoice_no} created` : 'Ready for invoice'}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenCreate(lead)}
                      style={{
                        height: '34px',
                        padding: '0 14px',
                        borderRadius: '7px',
                        backgroundColor: '#F68713',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={13} />
                      <span>Create Invoice</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 5. TAB 2: GENERATED INVOICES LIST */}
      {activeTab === 'invoices' && (
        <>
          {/* Desktop Table View */}
          <div
            className="inv-table-desktop"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E9EE',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderBottom: '1px solid #E6E9EE',
                    color: '#6B7280',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '12px 16px' }}>INVOICE NO</th>
                  <th style={{ padding: '12px 16px' }}>CLIENT / BILL TO</th>
                  <th style={{ padding: '12px 16px' }}>DATE & DUE</th>
                  <th style={{ padding: '12px 16px' }}>SERVICE</th>
                  <th style={{ padding: '12px 16px' }}>TOTAL AMOUNT</th>
                  <th style={{ padding: '12px 16px' }}>RECEIVED / BAL</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#111827' }}>
                      <span
                        style={{
                          backgroundColor: '#FFF3E6',
                          color: '#F68713',
                          border: '1px solid #FED7AA',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      >
                        #{inv.invoice_no}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 800, color: '#111827' }}>{inv.client_name}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{inv.client_phone || '—'}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ color: '#111827', fontWeight: 600 }}>{formatDate(inv.invoice_date)}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Due: {formatDate(inv.due_date)}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#374151', maxWidth: '200px' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {inv.service_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>SAC: {inv.sac_code}</div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#111827' }}>
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ color: '#059669', fontSize: '12px', fontWeight: 600 }}>Rec: {formatCurrency(inv.received_amount)}</div>
                      <div style={{ color: Number(inv.balance_amount) > 0 ? '#DC2626' : '#6B7280', fontSize: '12px', fontWeight: 700 }}>
                        Bal: {formatCurrency(inv.balance_amount)}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveInvoice(inv);
                            setViewInvoiceModalOpen(true);
                          }}
                          style={{
                            height: '32px',
                            padding: '0 10px',
                            borderRadius: '6px',
                            backgroundColor: '#2A9CB8',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <Printer size={12} />
                          <span>View / Print</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(inv)}
                          title="Share on WhatsApp"
                          style={{
                            height: '32px',
                            padding: '0 8px',
                            borderRadius: '6px',
                            backgroundColor: '#DCFCE7',
                            color: '#166534',
                            border: '1px solid #BBF7D0',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <Share2 size={12} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteInvoice(inv)}
                          disabled={deletingId === inv.id}
                          title="Delete Invoice"
                          style={{
                            height: '32px',
                            padding: '0 8px',
                            borderRadius: '6px',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            border: '1px solid #FECACA',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#9CA3AF' }}>
                      <ReceiptText size={36} style={{ margin: '0 auto 10px auto', opacity: 0.35, color: '#F68713' }} />
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#374151' }}>No invoices created yet</div>
                      <div style={{ fontSize: '12px', marginTop: '4px', color: '#9CA3AF' }}>
                        Switch to the "Won Deals Ready for Invoice" tab to create your first tax invoice.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="inv-cards-mobile">
            {filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E6E9EE',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        backgroundColor: '#FFF3E6',
                        color: '#F68713',
                        border: '1px solid #FED7AA',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      INV #{inv.invoice_no}
                    </span>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#111827', marginTop: '4px' }}>
                      {inv.client_name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#111827' }}>
                      {formatCurrency(inv.total_amount)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      {formatDate(inv.invoice_date)}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#4B5563', backgroundColor: '#F9FAFB', padding: '10px 12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 700, color: '#111827' }}>{inv.service_name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span>Rec: {formatCurrency(inv.received_amount)}</span>
                    <span style={{ color: Number(inv.balance_amount) > 0 ? '#DC2626' : '#059669', fontWeight: 700 }}>
                      Bal: {formatCurrency(inv.balance_amount)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #F3F4F6', paddingTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveInvoice(inv);
                      setViewInvoiceModalOpen(true);
                    }}
                    style={{
                      flex: 1,
                      height: '34px',
                      borderRadius: '6px',
                      backgroundColor: '#2A9CB8',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Printer size={13} />
                    <span>View / Print PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(inv)}
                    style={{
                      height: '34px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      backgroundColor: '#DCFCE7',
                      color: '#166534',
                      border: '1px solid #BBF7D0',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Share2 size={13} />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* 6. CREATE INVOICE MODAL (Strictly for Won Leads)             */}
      {/* ============================================================ */}
      {createModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #E6E9EE',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E6E9EE',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F9FAFB',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Create Tax Invoice
                </h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#6B7280' }}>
                  Auto-calculates GST taxes, breakdown, and converts total amount to Indian words.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateInvoice} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Lead Info Banner */}
              <div
                style={{
                  backgroundColor: '#FFF8F0',
                  border: '1px solid #FED7AA',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#F68713', letterSpacing: '0.04em' }}>
                    Won Deal Client
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                    {formData.client_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    Phone: {formData.client_phone || '—'} • Email: {formData.client_email || '—'}
                  </div>
                </div>
                <span
                  style={{
                    backgroundColor: '#DCFCE7',
                    color: '#166534',
                    border: '1px solid #BBF7D0',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  ✓ Won Deal Verified
                </span>
              </div>

              {/* Service Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Service Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.service_name}
                    onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                    placeholder="e.g. AI AVATAR GENERATION APP"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    SAC Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sac_code}
                    onChange={(e) => setFormData({ ...formData, sac_code: e.target.value })}
                    placeholder="e.g. 8965"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Place of Supply (State) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.place_of_supply}
                    onChange={(e) => setFormData({ ...formData, place_of_supply: e.target.value })}
                    placeholder="e.g. Bihar, Uttar Pradesh, Maharashtra"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Pricing & GST Tax */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '10px', border: '1px solid #E6E9EE' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Taxable Rate / Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    placeholder="e.g. 93432.20"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#111827',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    GST Rate (%) *
                  </label>
                  <select
                    value={formData.tax_percent}
                    onChange={(e) => setFormData({ ...formData, tax_percent: e.target.value })}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 10px',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#111827',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="18">18% Standard GST (9% CGST + 9% SGST)</option>
                    <option value="12">12% GST (6% CGST + 6% SGST)</option>
                    <option value="5">5% GST (2.5% CGST + 2.5% SGST)</option>
                    <option value="0">0% (Nil / Exempt)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Advance / Received Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.received_amount}
                    onChange={(e) => setFormData({ ...formData, received_amount: e.target.value })}
                    placeholder="e.g. 33075"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#059669',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '5px' }}>
                    Payment Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Realtime Calculation Summary Card */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Taxable Amount:</span>
                  <span style={{ fontWeight: 700, color: '#1E293B' }}>{formatCurrency(baseRate)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>CGST @ {taxPct / 2}%:</span>
                  <span style={{ fontWeight: 600, color: '#1E293B' }}>{formatCurrency(cgstAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>SGST @ {taxPct / 2}%:</span>
                  <span style={{ fontWeight: 600, color: '#1E293B' }}>{formatCurrency(sgstAmount)}</span>
                </div>
                <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span style={{ fontWeight: 800, color: '#0F172A' }}>Total Invoice Amount:</span>
                  <span style={{ fontWeight: 800, color: '#0F172A' }}>{formatCurrency(totalAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#059669' }}>Received Advance:</span>
                  <span style={{ fontWeight: 700, color: '#059669' }}>- {formatCurrency(receivedAmt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                  <span style={{ fontWeight: 800, color: '#DC2626' }}>Balance Payable:</span>
                  <span style={{ fontWeight: 800, color: '#DC2626' }}>{formatCurrency(balanceAmount)}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', fontStyle: 'italic' }}>
                  Amount in words: <strong>{amountInWords}</strong>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E6E9EE', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    border: '1px solid #E6E9EE',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    height: '38px',
                    padding: '0 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#F68713',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 3px rgba(246,135,19,0.3)',
                  }}
                >
                  {submitting ? 'Creating Invoice…' : 'Generate Tax Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. VIEW / PRINT INVOICE MODAL (PIXEL-PERFECT TEMPLATE)        */}
      {/* ============================================================ */}
      {viewInvoiceModalOpen && activeInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '94vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E6E9EE',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Top Toolbar (No-Print) */}
            <div
              className="no-print"
              style={{
                padding: '14px 24px',
                borderBottom: '1px solid #E6E9EE',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F9FAFB',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                  Invoice #{activeInvoice.invoice_no}
                </span>
                <span
                  style={{
                    backgroundColor: '#DCFCE7',
                    color: '#166534',
                    border: '1px solid #BBF7D0',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 800,
                  }}
                >
                  Original Tax Invoice
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePrint}
                  style={{
                    height: '34px',
                    padding: '0 14px',
                    borderRadius: '7px',
                    backgroundColor: '#111827',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Printer size={13} />
                  <span>Print / Save as PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(activeInvoice)}
                  style={{
                    height: '34px',
                    padding: '0 14px',
                    borderRadius: '7px',
                    backgroundColor: '#25D366',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Share2 size={13} />
                  <span>Send via WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewInvoiceModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PRINTABLE INVOICE DOCUMENT (EXACT MATCH OF SAMPLE PDF) */}
            <div
              id="printable-invoice-document"
              style={{
                padding: '36px 42px',
                backgroundColor: '#FFFFFF',
                color: '#111827',
                fontSize: '12px',
                lineHeight: 1.45,
                fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
              }}
            >
              {/* Badges on Top */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', border: '1px solid #D1D5DB', padding: '2px 8px', borderRadius: '4px', color: '#374151' }}>
                  TAX INVOICE
                </span>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', border: '1px solid #D1D5DB', padding: '2px 8px', borderRadius: '4px', color: '#6B7280' }}>
                  ORIGINAL FOR RECIPIENT
                </span>
              </div>

              {/* Company Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', marginBottom: '22px' }}>
                {/* Logo */}
                <div style={{ flexShrink: 0 }}>
                  <img
                    src="/surfsync-logo.png"
                    alt="SurfSync Logo"
                    style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>

                {/* Company Details */}
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#00529B', margin: '0 0 4px 0', letterSpacing: '-0.01em' }}>
                    SURFSYNC INFOTECH PRIVATE LIMITED
                  </h1>
                  <div style={{ fontSize: '11px', color: '#374151', margin: '2px 0' }}>
                    A-431, 4th Floor, Anthurium, Sector 73, Noida UP, Noida, Uttar Pradesh, 201316
                  </div>
                  <div style={{ fontSize: '11px', color: '#111827', fontWeight: 600, margin: '2px 0' }}>
                    Mobile: 9429693456 &nbsp;&nbsp; GSTIN: 10ABOCS8219H1Z8 &nbsp;&nbsp; PAN Number: ABOCS8219H
                  </div>
                  <div style={{ fontSize: '11px', color: '#374151', margin: '2px 0' }}>
                    Email: info@surfsyncinfotech.in &nbsp;&nbsp;|&nbsp;&nbsp; SurfSync Infotech: www.surfsyncinfotech.in
                  </div>
                </div>
              </div>

              {/* Invoice Meta Stripe */}
              <div
                style={{
                  backgroundColor: '#E5E7EB',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#111827',
                  marginBottom: '20px',
                }}
              >
                <div>Invoice No.: {activeInvoice.invoice_no}</div>
                <div>Invoice Date: {formatDate(activeInvoice.invoice_date)}</div>
                <div>Due Date: {formatDate(activeInvoice.due_date)}</div>
              </div>

              {/* Bill To Section */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#111827', letterSpacing: '0.04em', marginBottom: '4px' }}>
                  BILL TO
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                  {activeInvoice.client_name}
                </div>
                <div style={{ fontSize: '12px', color: '#374151', marginTop: '2px' }}>
                  Mobile: {activeInvoice.client_phone || '—'}
                </div>
                <div style={{ fontSize: '12px', color: '#374151', marginTop: '2px' }}>
                  Place of Supply: {activeInvoice.place_of_supply || 'Bihar'}
                </div>
              </div>

              {/* Services Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #00529B', color: '#111827', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 0', textAlign: 'left' }}>SERVICES</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>SAC</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>RATE</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>TAX</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #E5E7EB', fontSize: '12px' }}>
                    <td style={{ padding: '12px 0', fontWeight: 700, color: '#111827' }}>
                      {activeInvoice.service_name}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#374151' }}>
                      {activeInvoice.sac_code || '8965'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                      {Number(activeInvoice.rate).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#111827' }}>
                      <div style={{ fontWeight: 600 }}>
                        {Number(activeInvoice.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6B7280' }}>({activeInvoice.tax_percent}%)</div>
                    </td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 800, color: '#111827' }}>
                      {Number(activeInvoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Subtotal Row */}
                  <tr style={{ borderTop: '2px solid #00529B', borderBottom: '2px solid #00529B', fontWeight: 800 }}>
                    <td style={{ padding: '10px 0', fontSize: '11px', textTransform: 'uppercase' }}>
                      SUBTOTAL
                    </td>
                    <td />
                    <td />
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      ₹ {Number(activeInvoice.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>
                      ₹ {Number(activeInvoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Bottom Two-Column Breakdown matching Sample PDF */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginTop: '16px' }}>
                {/* Left Column: Bank Details & Terms */}
                <div>
                  {/* Bank Details */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#111827', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      BANK DETAILS
                    </div>
                    <div style={{ fontSize: '11px', color: '#374151', lineHeight: 1.5 }}>
                      <div>Name: <strong>{activeInvoice.bank_account_name || 'SURFSYNC INFOTECH PVT. LTD'}</strong></div>
                      <div>IFSC Code: <strong>{activeInvoice.bank_ifsc || 'SBIN0001483'}</strong></div>
                      <div>Account No: <strong>{activeInvoice.bank_account_no || '45182936194'}</strong></div>
                      <div>Bank: <strong>{activeInvoice.bank_name || 'State Bank of India'}, {activeInvoice.bank_branch || 'LAL GANJ'}</strong></div>
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#111827', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      TERMS AND CONDITIONS
                    </div>
                    <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '10.5px', color: '#4B5563', lineHeight: 1.5 }}>
                      <li>Payment must be made within the due date mentioned on the invoice.</li>
                      <li>Deliverables, source code, and ownership rights will be transferred only after full payment is received.</li>
                      <li>Any work beyond the agreed scope shall be charged additionally.</li>
                      <li>Payments once made are non-refundable.</li>
                      <li>All disputes shall be subject to the jurisdiction of Patna, Bihar.</li>
                    </ol>
                  </div>
                </div>

                {/* Right Column: Tax Breakdown, Totals, Amount in Words & Signatures */}
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11.5px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4B5563' }}>Taxable Amount</span>
                      <span style={{ fontWeight: 600 }}>₹ {Number(activeInvoice.rate).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
                    </div>

                    {activeInvoice.is_interstate ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4B5563' }}>IGST @{activeInvoice.tax_percent}%</span>
                        <span style={{ fontWeight: 600 }}>₹ {Number(activeInvoice.igst_amount || activeInvoice.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#4B5563' }}>CGST @{activeInvoice.tax_percent / 2}%</span>
                          <span style={{ fontWeight: 600 }}>₹ {Number(activeInvoice.cgst_amount || activeInvoice.tax_amount / 2).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#4B5563' }}>SGST @{activeInvoice.tax_percent / 2}%</span>
                          <span style={{ fontWeight: 600 }}>₹ {Number(activeInvoice.sgst_amount || activeInvoice.tax_amount / 2).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    )}

                    <div style={{ height: '1px', backgroundColor: '#E5E7EB', margin: '4px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800 }}>
                      <span>Total Amount</span>
                      <span>₹ {Number(activeInvoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div style={{ height: '1px', backgroundColor: '#E5E7EB', margin: '4px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4B5563' }}>Received Amount</span>
                      <span style={{ fontWeight: 600 }}>₹ {Number(activeInvoice.received_amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 800 }}>
                      <span>Balance</span>
                      <span style={{ color: Number(activeInvoice.balance_amount) > 0 ? '#111827' : '#059669' }}>
                        ₹ {Number(activeInvoice.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Total Amount in Words */}
                  <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '8px', marginBottom: '24px', textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>Total Amount (in words)</div>
                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                      {activeInvoice.amount_in_words || numberToIndianWords(activeInvoice.total_amount)}
                    </div>
                  </div>

                  {/* Authorised Signatory Block matching PDF */}
                  <div style={{ textAlign: 'right', marginTop: '14px', marginBottom: '18px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#111827', letterSpacing: '0.04em' }}>
                      AUTHORISED SIGNATORY FOR
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#111827' }}>
                      SURFSYNC INFOTECH PRIVATE LIMITED
                    </div>
                    <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <div style={{ fontStyle: 'italic', color: '#00529B', fontWeight: 800, fontSize: '14px', borderBottom: '1px solid #111827', padding: '0 10px' }}>
                        Shivam Bhardwaj (Director)
                      </div>
                    </div>
                  </div>

                  {/* Receiver's Signature Box */}
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        width: '240px',
                        height: '60px',
                        border: '1px solid #9CA3AF',
                        borderRadius: '2px',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#374151', marginTop: '4px' }}>
                      Receiver's Signature
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
