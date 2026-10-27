import { useEffect, useState } from 'react';
import { companiesApi, plansApi, paymentsApi } from '../api/client';

function money(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString('en-IN');
}

function numberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  num = Math.floor(Number(num || 0));
  if (num === 0) return 'Zero Rupees';
  if (num.toString().length > 9) return 'Amount too large';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += n[1] != 0 ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += n[2] != 0 ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += n[3] != 0 ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += n[4] != 0 ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += n[5] != 0 ? (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees ' : '';
  return str.trim() + ' Only';
}

const getInvoicePrintHtml = (p, company, plan) => {
  const planName = plan?.name || 'Trial';
  const cycle = p.billing_cycle.toUpperCase();
  const amtWords = numberToWords(p.amount);
  const isPaid = p.status === 'paid';
  const formattedDueDate = formatDate(p.due_date);
  const formattedInvoiceDate = formatDate(p.created_at || new Date());
  
  const featuresList = plan?.features 
    ? (Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]'))
    : ['Basic CRM Access', 'Lead Retrieval & Assignment', 'WhatsApp Integration', 'Basic Reports'];

  return `
    <html>
      <head>
        <title>Invoice ${p.invoice_number} - ${company.name || 'Company'}</title>
        <style>
          body { font-family: 'Segoe UI', Roboto, sans-serif; color: #333; margin: 20px; line-height: 1.4; }
          .invoice-box { max-width: 800px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .header-table td { vertical-align: top; }
          .company-name { font-size: 1.5rem; font-weight: 700; color: #1f9a5a; margin: 0 0 5px 0; }
          .invoice-title { font-size: 1.25rem; font-weight: 700; color: #fff; background: #1f9a5a; padding: 5px 10px; border-radius: 4px; display: inline-block; float: right; }
          .meta-table { width: 100%; border-collapse: collapse; background: #f4f6f5; border: 1px solid #ddd; margin-bottom: 20px; }
          .meta-table td { padding: 10px; font-size: 0.9rem; border-right: 1px solid #ddd; }
          .meta-table td:last-child { border-right: none; }
          .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .grid-table td { width: 50%; vertical-align: top; }
          .bill-to-box { border: 1px solid #ddd; border-radius: 6px; padding: 15px; background: #fafafa; }
          .bill-to-box h3 { margin: 0 0 10px 0; color: #1f9a5a; font-size: 1.1rem; }
          .item-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .item-table th { background: #1f9a5a; color: #fff; text-align: left; padding: 10px; font-size: 0.9rem; }
          .item-table td { padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 0.9rem; vertical-align: top; }
          .subtotal-row td { font-weight: 700; background: #f9f9f9; }
          .bank-terms-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .bank-terms-table td { width: 50%; vertical-align: top; padding-right: 15px; }
          .bank-box { border: 1px solid #b3d7ff; background: #f0f7ff; padding: 12px; border-radius: 6px; font-size: 0.85rem; }
          .bank-box h4 { margin: 0 0 8px 0; color: #0056b3; }
          .terms-box { border: 1px solid #ffeeba; background: #fff3cd; padding: 12px; border-radius: 6px; font-size: 0.8rem; color: #856404; }
          .terms-box h4 { margin: 0 0 8px 0; }
          .summary-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
          .summary-table td { padding: 8px; border-bottom: 1px solid #eee; }
          .summary-table tr:last-child td { border-bottom: none; font-weight: 700; }
          .summary-box { border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 15px; }
          .signatory-box { text-align: center; font-size: 0.8rem; margin-top: 30px; }
          .signatory-box strong { display: block; margin-top: 40px; border-top: 1px solid #333; padding-top: 5px; width: 200px; margin-left: auto; }
          @media print {
            body { margin: 0; }
            .invoice-box { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <table class="header-table">
            <tr>
              <td>
                <div class="company-name">SURFSYNC INFOTECH PRIVATE LIMITED</div>
                <div style="font-size: 0.85rem; color: #555;">
                  SurfSync Infotech Pvt. Ltd, Sector-75, Noida, UP 201301<br/>
                  Mobile: 9429693456 | Email: info@surfsyncinfotech.in<br/>
                  GSTIN: 10ABOCS8219H1Z8 | PAN: ABOCS8219H
                </div>
              </td>
              <td style="text-align: right;">
                <div class="invoice-title">BILL OF SUPPLY</div>
              </td>
            </tr>
          </table>

          <table class="meta-table">
            <tr>
              <td><strong>Invoice No:</strong> ${p.invoice_number}</td>
              <td><strong>Invoice Date:</strong> ${formattedInvoiceDate}</td>
              <td><strong>Due Date:</strong> ${formattedDueDate}</td>
            </tr>
          </table>

          <table class="grid-table">
            <tr>
              <td style="padding-right: 10px;">
                <div class="bill-to-box">
                  <h3>BILL TO</h3>
                  <strong>${company.name || 'Company'}</strong><br/>
                  ${[company.city, company.state, company.country].filter(Boolean).join(', ') || 'Address not set'}<br/>
                  Email: ${company.admin_email || company.email || '—'}<br/>
                  Phone: ${company.phone || '—'}
                </div>
              </td>
              <td style="padding-left: 10px;">
                <div class="summary-box">
                  <table class="summary-table">
                    <tr>
                      <td>Total Amount:</td>
                      <td style="text-align: right; font-weight: 600;">${money(p.amount)}</td>
                    </tr>
                    <tr>
                      <td>Received Amount:</td>
                      <td style="text-align: right; color: #1f9a5a; font-weight: 600;">${money(isPaid ? p.amount : 0)}</td>
                    </tr>
                    <tr>
                      <td>Balance Due:</td>
                      <td style="text-align: right; color: #c53929; font-weight: 700;">${money(isPaid ? 0 : p.amount)}</td>
                    </tr>
                  </table>
                </div>
                <div style="border: 1px solid #d2e3fc; background: #e8f0fe; padding: 10px; border-radius: 6px; font-size: 0.85rem;">
                  <strong>Amount in words:</strong><br/>
                  <span style="font-style: italic; color: #1a73e8;">${amtWords}</span>
                </div>
              </td>
            </tr>
          </table>

          <table class="item-table">
            <thead>
              <tr>
                <th>SERVICES</th>
                <th style="text-align: right; width: 120px;">RATE</th>
                <th style="text-align: right; width: 120px;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong style="color: #1f9a5a;">SURFSYNC CRM SUBSCRIPTION — ${planName.toUpperCase()} PLAN</strong>
                  <div style="font-size: 0.8rem; color: #666; margin-top: 8px;">
                    Scope of Work & Features:
                    <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                      ${featuresList.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                  </div>
                </td>
                <td style="text-align: right; font-weight: 600;">${money(p.amount)}</td>
                <td style="text-align: right; font-weight: 600;">${money(p.amount)}</td>
              </tr>
              <tr class="subtotal-row">
                <td>SUBTOTAL</td>
                <td colspan="2" style="text-align: right; color: #1f9a5a;">${money(p.amount)}</td>
              </tr>
            </tbody>
          </table>

          <table class="bank-terms-table">
            <tr>
              <td>
                <div class="bank-box">
                  <h4>Bank Details</h4>
                  <strong>Name:</strong> SURFSYNC INFOTECH PVT. LTD.<br/>
                  <strong>IFSC Code:</strong> SBIN0001483<br/>
                  <strong>Account No:</strong> 45182936194<br/>
                  <strong>Bank:</strong> State Bank of India, LAL GANJ
                </div>
              </td>
              <td>
                <div class="terms-box">
                  <h4>Terms and Conditions</h4>
                  1. Payment must be made within the due date.<br/>
                  2. Deliverables and rights are transferred after full payment.<br/>
                  3. Any work beyond scope will be charged additionally.<br/>
                  4. Payments once made are non-refundable.<br/>
                  5. All disputes shall be subject to the jurisdiction of Patna, Bihar.
                </div>
              </td>
            </tr>
          </table>

          <div class="signatory-box">
            <div style="font-size: 0.85rem; font-weight: 600; color: #555; margin-bottom: 50px;">
              AUTHORISED SIGNATORY FOR SURFSYNC INFOTECH PRIVATE LIMITED
            </div>
            <div style="font-family: 'Courier New', Courier, monospace; font-size: 1.1rem; color: #0056b3; font-style: italic; font-weight: bold;">
              SurfSync Infotech Pvt. Ltd.
            </div>
            <strong>Authorised Signatory</strong>
          </div>
        </div>
      </body>
    </html>
  `;
};

export default function BillingPage() {
  const [payments, setPayments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Filter
  const [filterType, setFilterType] = useState('all'); // 'all' | 'pending' | 'paid' | 'overdue'

  // Modal control
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null); // for previewing invoice

  // Form state
  const [form, setForm] = useState({
    company_id: '',
    plan_id: '',
    billing_cycle: 'monthly',
    amount: '0',
    due_date: '',
    notes: '',
  });

  async function loadData() {
    try {
      setLoading(true);
      const [payRes, compRes, planRes] = await Promise.all([
        paymentsApi.list(),
        companiesApi.list(),
        plansApi.list(),
      ]);
      setPayments(payRes.payments);
      setCompanies(compRes.companies);
      setPlans(planRes.plans);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handlePlanChange = (planId) => {
    const selectedPlan = plans.find((p) => String(p.id) === String(planId));
    if (selectedPlan) {
      const isYearly = form.billing_cycle === 'yearly';
      setForm((prev) => ({
        ...prev,
        plan_id: planId,
        amount: isYearly ? String(selectedPlan.price_yearly) : String(selectedPlan.price_monthly),
      }));
    } else {
      setForm((prev) => ({ ...prev, plan_id: planId, amount: '0' }));
    }
  };

  const handleCycleChange = (cycle) => {
    const selectedPlan = plans.find((p) => String(p.id) === String(form.plan_id));
    if (selectedPlan) {
      const isYearly = cycle === 'yearly';
      setForm((prev) => ({
        ...prev,
        billing_cycle: cycle,
        amount: isYearly ? String(selectedPlan.price_yearly) : String(selectedPlan.price_monthly),
      }));
    } else {
      setForm((prev) => ({ ...prev, billing_cycle: cycle }));
    }
  };

  const handleCompanyChange = (companyId) => {
    const selectedCompany = companies.find((c) => String(c.id) === String(companyId));
    if (selectedCompany) {
      const planId = selectedCompany.plan_id ? String(selectedCompany.plan_id) : 'trial';
      const selectedPlan = plans.find((p) => String(p.id) === planId);
      const isYearly = form.billing_cycle === 'yearly';
      const amount = selectedPlan 
        ? (isYearly ? selectedPlan.price_yearly : selectedPlan.price_monthly)
        : '0';

      setForm((prev) => ({
        ...prev,
        company_id: companyId,
        plan_id: planId,
        amount: String(amount),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        company_id: companyId,
        plan_id: '',
        amount: '0',
      }));
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!form.company_id) return;
    setBusy(true);
    setError('');
    try {
      await paymentsApi.create({
        company_id: Number(form.company_id),
        plan_id: form.plan_id ? Number(form.plan_id) : null,
        amount: Number(form.amount),
        billing_cycle: form.billing_cycle,
        due_date: form.due_date || null,
        status: 'pending',
        notes: form.notes,
      });
      setShowCreateModal(false);
      // Reset form
      setForm({
        company_id: '',
        plan_id: '',
        billing_cycle: 'monthly',
        amount: '0',
        due_date: '',
        notes: '',
      });
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPaid = async (id) => {
    if (!window.confirm('Are you sure you want to mark this invoice as paid?')) return;
    setBusy(true);
    try {
      await paymentsApi.markPaid(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    setBusy(true);
    try {
      await paymentsApi.delete(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const getWhatsAppLink = (p) => {
    const company = companies.find((c) => c.id === p.company_id);
    const phone = company?.phone || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = `Hello, an invoice (${p.invoice_number}) has been generated for ${p.company_name}.
Amount: ${money(p.amount)}
Due Date: ${formatDate(p.due_date)}
Please login to your portal to make the payment: ${window.location.origin}/c/${company?.slug}/login`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  // Stats calculation
  const stats = payments.reduce(
    (acc, p) => {
      const isOverdue =
        p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date();
      if (p.status === 'paid') {
        acc.paid += 1;
        acc.revenue += Number(p.amount);
      } else if (p.status === 'pending') {
        if (isOverdue) {
          acc.overdue += 1;
        } else {
          acc.pending += 1;
        }
      }
      return acc;
    },
    { pending: 0, paid: 0, overdue: 0, revenue: 0 }
  );

  // Filtered Payments list
  const filteredPayments = payments.filter((p) => {
    if (filterType === 'all') return true;
    if (filterType === 'paid') return p.status === 'paid';
    if (filterType === 'pending') return p.status === 'pending' && (!p.due_date || new Date(p.due_date) >= new Date());
    if (filterType === 'overdue') return p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date();
    return true;
  });

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Finance</p>
          <h1>Billing</h1>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            Manage invoices and track payments
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          style={{ backgroundColor: 'var(--green-600)', borderColor: 'var(--green-600)' }}
          onClick={() => setShowCreateModal(true)}
        >
          + Create Invoice
        </button>
      </header>

      {error && <div className="alert">{error}</div>}

      {/* STAT CARDS */}
      <section className="stat-grid" style={{ marginTop: '1.25rem' }}>
        <article className="stat-card">
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#666' }}>PENDING</span>
          <strong style={{ color: '#d9534f' }}>{stats.pending}</strong>
        </article>
        <article className="stat-card">
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#666' }}>PAID</span>
          <strong style={{ color: 'var(--green-600)' }}>{stats.paid}</strong>
        </article>
        <article className="stat-card">
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#666' }}>OVERDUE</span>
          <strong style={{ color: '#c65911' }}>{stats.overdue}</strong>
        </article>
        <article className="stat-card accent" style={{ borderLeftColor: 'var(--green-600)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#fff' }}>TOTAL REVENUE</span>
          <strong style={{ color: '#fff' }}>{money(stats.revenue)}</strong>
        </article>
      </section>

      {/* FILTER ROW */}
      <div className="gov-table-stack" style={{ marginTop: '1.5rem' }}>
        <div className="gov-table-toolbar" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <div className="gov-table-tools" style={{ gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
              FILTER:
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #ccc' }}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </label>
          </div>
        </div>

        {/* PAYMENTS TABLE */}
        <div className="gov-table-wrap">
          <div className="gov-table-scroll">
            <table className="gov-table">
              <thead style={{ backgroundColor: 'var(--green-600)', color: '#ffffff' }}>
                <tr>
                  <th style={{ color: '#ffffff' }}>INVOICE #</th>
                  <th style={{ color: '#ffffff' }}>COMPANY</th>
                  <th style={{ color: '#ffffff' }}>PLAN</th>
                  <th style={{ color: '#ffffff' }}>AMOUNT</th>
                  <th style={{ color: '#ffffff' }}>CYCLE</th>
                  <th style={{ color: '#ffffff' }}>DUE DATE</th>
                  <th style={{ color: '#ffffff' }}>STATUS</th>
                  <th style={{ color: '#ffffff' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="gov-empty" style={{ textAlign: 'center' }}>
                      Loading invoices…
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="gov-empty" style={{ textAlign: 'center', padding: '2rem' }}>
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p, index) => {
                    const isOverdue =
                      p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date();
                    return (
                      <tr key={p.id} className={index % 2 === 1 ? 'gov-row-alt' : ''}>
                        <td className="gov-strong">{p.invoice_number}</td>
                        <td className="gov-strong" style={{ color: 'var(--green-600)' }}>{p.company_name}</td>
                        <td>{p.plan_name || 'Trial'}</td>
                        <td style={{ fontWeight: '600' }}>{money(p.amount)}</td>
                        <td style={{ textTransform: 'uppercase' }}>{p.billing_cycle}</td>
                        <td>{formatDate(p.due_date)}</td>
                        <td>
                          <span
                            className={`badge`}
                            style={{
                              backgroundColor: p.status === 'paid' ? '#e2f0d9' : isOverdue ? '#fce4d6' : '#fff3cd',
                              color: p.status === 'paid' ? '#385723' : isOverdue ? '#c65911' : '#856404',
                              border: `1px solid ${p.status === 'paid' ? '#c5e0b4' : isOverdue ? '#f8cbad' : '#ffeeba'}`,
                              textTransform: 'uppercase',
                              fontWeight: '600',
                            }}
                          >
                            {p.status === 'paid' ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'}
                          </span>
                        </td>
                        <td>
                          <div className="gov-actions" style={{ gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="gov-btn"
                              onClick={() => setActiveInvoice(p)}
                              style={{ backgroundColor: '#e8f0fe', color: '#1a73e8', borderColor: '#d2e3fc' }}
                            >
                              Invoice
                            </button>
                            {p.status === 'pending' && (
                              <button
                                type="button"
                                className="gov-btn"
                                onClick={() => handleMarkPaid(p.id)}
                                style={{ backgroundColor: '#fff4eb', color: 'var(--green-600)', borderColor: 'var(--green-200)' }}
                              >
                                Mark Paid
                              </button>
                            )}
                            <a
                              href={getWhatsAppLink(p)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gov-btn"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                backgroundColor: '#25d366',
                                color: '#fff',
                                borderColor: '#25d366',
                                textDecoration: 'none',
                                fontWeight: '500',
                              }}
                            >
                              WhatsApp
                            </a>
                            <button
                              type="button"
                              className="gov-btn gov-btn-danger"
                              onClick={() => handleDelete(p.id)}
                              style={{ backgroundColor: '#fcdcd8', color: '#c53929', borderColor: '#f8b6ae' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <h3 style={{ backgroundColor: 'var(--green-600)', color: '#fff', margin: '-1.75rem -1.75rem 1.25rem -1.75rem', padding: '1.25rem 1.75rem', borderRadius: '12px 12px 0 0', fontWeight: '700' }}>
              CREATE INVOICE
            </h3>
            <form onSubmit={handleCreateInvoice} style={{ display: 'grid', gap: '0.85rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: '500' }}>
                Company *
                <select
                  value={form.company_id}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  required
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: '500' }}>
                Subscription Plan *
                <select
                  value={form.plan_id}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  required
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  <option value="">Select plan</option>
                  <option value="trial">Trial (No Plan)</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: '500' }}>
                  Billing Cycle
                  <select
                    value={form.billing_cycle}
                    onChange={(e) => handleCycleChange(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: '500' }}>
                  Amount (INR) *
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    required
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: '500' }}>
                Due Date
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                  required
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontWeight: '500' }}>
                Notes
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Invoice notes or payment terms"
                  rows={3}
                  style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }}
                />
              </label>

              <div className="modal-actions" style={{ margin: '0.5rem 0 0 0' }}>
                <button
                  type="button"
                  className="gov-btn"
                  onClick={() => setShowCreateModal(false)}
                  disabled={busy}
                  style={{ color: 'var(--green-600)', borderColor: '#ddd', backgroundColor: '#f9f9f9', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={busy}
                  style={{ backgroundColor: 'var(--green-600)', color: '#fff', border: 'none', fontWeight: '600' }}
                >
                  {busy ? 'Creating…' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW INVOICE MODAL */}
      {activeInvoice && (() => {
        const company = companies.find((c) => c.id === activeInvoice.company_id) || {};
        const plan = plans.find((pl) => pl.id === activeInvoice.plan_id) || {};
        const planName = plan?.name || 'Trial';
        const isPaid = activeInvoice.status === 'paid';
        const amtWords = numberToWords(activeInvoice.amount);
        const formattedDueDate = formatDate(activeInvoice.due_date);
        const formattedInvoiceDate = formatDate(activeInvoice.created_at || new Date());
        
        const featuresList = plan?.features 
          ? (Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]'))
          : ['Basic CRM Access', 'Lead Retrieval & Assignment', 'WhatsApp Integration', 'Basic Reports'];

        const handlePrint = () => {
          const win = window.open('', '_blank');
          win.document.write(getInvoicePrintHtml(activeInvoice, company, plan));
          win.document.close();
          win.focus();
          setTimeout(() => {
            win.print();
          }, 500);
        };

        return (
          <div className="modal-overlay">
            <div className="modal-card" style={{ maxWidth: '850px', width: '90%', maxHeight: '90vh', overflowY: 'auto', padding: 0, border: 'none' }}>
              
              {/* Header actions */}
              <h3 style={{ backgroundColor: 'var(--green-600)', color: '#fff', margin: 0, padding: '1rem 1.5rem', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Invoice {activeInvoice.invoice_number} — {company.name}</span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handlePrint}
                    style={{ backgroundColor: 'var(--green-600)', color: '#fff', border: 'none', padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    Print / Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInvoice(null)}
                    style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', padding: 0, margin: 0, lineHeight: 1 }}
                  >
                    &times;
                  </button>
                </div>
              </h3>

              {/* Invoice body in React */}
              <div style={{ padding: '2rem', background: '#fff', color: '#333', fontSize: '0.9rem', lineHeight: '1.5', textAlign: 'left' }}>
                
                {/* Header Table */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--green-600)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--green-600)', fontSize: '1.5rem', fontWeight: '700' }}>SURFSYNC INFOTECH PRIVATE LIMITED</h2>
                    <div style={{ fontSize: '0.85rem', color: '#555' }}>
                      SurfSync Infotech Pvt. Ltd, Sector-75, Noida, UP 201301<br />
                      Mobile: 9429693456 | Email: info@surfsyncinfotech.in<br />
                      GSTIN: 10ABOCS8219H1Z8 | PAN: ABOCS8219H
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', background: 'var(--green-600)', padding: '0.4rem 0.8rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                      BILL OF SUPPLY
                    </span>
                  </div>
                </div>

                {/* Meta Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', backgroundColor: '#f4f6f5', border: '1px solid #ddd', padding: '0.85rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
                  <div><strong>Invoice No:</strong> {activeInvoice.invoice_number}</div>
                  <div><strong>Invoice Date:</strong> {formattedInvoiceDate}</div>
                  <div><strong>Due Date:</strong> {formattedDueDate}</div>
                </div>

                {/* Grid layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '1.25rem', backgroundColor: '#fafafa' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--green-600)', fontSize: '1.05rem', fontWeight: '700' }}>BILL TO</h4>
                    <strong style={{ fontSize: '1.05rem' }}>{company.name || 'Company Name'}</strong>
                    <div style={{ marginTop: '0.5rem', color: '#555' }}>
                      {[company.city, company.state, company.country].filter(Boolean).join(', ') || 'Address not set'}<br />
                      Email: {company.admin_email || company.email || '—'}<br />
                      Phone: {company.phone || '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '1rem', marginBottom: '0.85rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '0.5rem 0' }}>Total Amount:</td>
                            <td style={{ textAlign: 'right', fontWeight: '600' }}>{money(activeInvoice.amount)}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '0.5rem 0' }}>Received Amount:</td>
                            <td style={{ textAlign: 'right', color: 'var(--green-600)', fontWeight: '600' }}>{money(isPaid ? activeInvoice.amount : 0)}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '0.5rem 0' }}>Balance Due:</td>
                            <td style={{ textAlign: 'right', color: '#c53929', fontWeight: '700' }}>{money(isPaid ? 0 : activeInvoice.amount)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div style={{ border: '1px solid #d2e3fc', backgroundColor: '#e8f0fe', padding: '0.85rem', borderRadius: '6px' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#1a73e8' }}>Amount in words:</strong>
                      <div style={{ fontStyle: 'italic', fontWeight: '600', color: '#1a73e8', marginTop: '0.25rem' }}>{amtWords}</div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--green-600)', color: '#fff' }}>
                      <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: '600', color: '#fff' }}>SERVICES</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: '600', width: '120px', color: '#fff' }}>RATE</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.85rem', fontWeight: '600', width: '120px', color: '#fff' }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        <strong style={{ color: 'var(--green-600)' }}>SURFSYNC CRM SUBSCRIPTION — {planName.toUpperCase()} PLAN</strong>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                          Scope of Work & Features:
                          <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem' }}>
                            {featuresList.map((f) => <li key={f}>{f}</li>)}
                          </ul>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '1rem 0.75rem', fontWeight: '600', verticalAlign: 'top' }}>{money(activeInvoice.amount)}</td>
                      <td style={{ textAlign: 'right', padding: '1rem 0.75rem', fontWeight: '600', verticalAlign: 'top' }}>{money(activeInvoice.amount)}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f9f9f9', fontWeight: '700' }}>
                      <td style={{ padding: '0.75rem' }}>SUBTOTAL</td>
                      <td colSpan={2} style={{ textAlign: 'right', padding: '0.75rem', color: 'var(--green-600)' }}>{money(activeInvoice.amount)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Bank / Terms */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ border: '1px solid #b3d7ff', backgroundColor: '#f0f7ff', padding: '1rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#0056b3', fontWeight: '700' }}>Bank Details</h4>
                    <strong>Name:</strong> SURFSYNC INFOTECH PVT. LTD.<br />
                    <strong>IFSC Code:</strong> SBIN0001483<br />
                    <strong>Account No:</strong> 45182936194<br />
                    <strong>Bank:</strong> State Bank of India, LAL GANJ
                  </div>
                  <div style={{ border: '1px solid #ffeeba', backgroundColor: '#fff3cd', padding: '1rem', borderRadius: '6px', fontSize: '0.8rem', color: '#856404' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '700' }}>Terms and Conditions</h4>
                    1. Payment must be made within the due date.<br />
                    2. Deliverables and rights are transferred after full payment.<br />
                    3. Any work beyond scope will be charged additionally.<br />
                    4. Payments once made are non-refundable.<br />
                    5. All disputes shall be subject to the jurisdiction of Patna, Bihar.
                  </div>
                </div>

                {/* Footer close */}
                <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="gov-btn"
                    onClick={() => setActiveInvoice(null)}
                    style={{ backgroundColor: '#f2f2f2', border: '1px solid #ccc', padding: '0.5rem 1.5rem', borderRadius: '6px' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
