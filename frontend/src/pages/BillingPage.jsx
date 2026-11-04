import { useEffect, useState } from 'react';
import { companiesApi, plansApi, paymentsApi } from '../api/client';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Printer,
  X,
  MessageSquare,
  Trash2,
  Calendar,
  Building2,
  ArrowRight,
} from 'lucide-react';

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
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
  const cycle = (p.billing_cycle || 'monthly').toUpperCase();
  const amtWords = numberToWords(p.amount);
  const isPaid = p.status === 'paid';
  const formattedDueDate = formatDate(p.due_date);
  const formattedInvoiceDate = formatDate(p.created_at || new Date());

  const featuresList = plan?.features
    ? Array.isArray(plan.features)
      ? plan.features
      : JSON.parse(plan.features || '[]')
    : ['Basic CRM Access', 'Lead Retrieval & Assignment', 'WhatsApp Integration', 'Basic Reports'];

  return `
    <html>
      <head>
        <title>Invoice ${p.invoice_number} - ${company?.name || 'Company'}</title>
        <style>
          body { font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; margin: 24px; line-height: 1.5; }
          .invoice-box { max-width: 800px; margin: auto; padding: 24px; border: 1px solid #E6E9EE; border-radius: 12px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .header-table td { vertical-align: top; }
          .company-name { font-size: 1.4rem; font-weight: 800; color: #07A96A; margin: 0 0 6px 0; }
          .invoice-title { font-size: 1.15rem; font-weight: 800; color: #067C52; background: #E8F8F0; padding: 6px 14px; border-radius: 6px; display: inline-block; float: right; border: 1px solid #B7E8D2; }
          .meta-table { width: 100%; border-collapse: collapse; background: #F9FAFB; border: 1px solid #E6E9EE; border-radius: 8px; margin-bottom: 24px; }
          .meta-table td { padding: 10px 14px; font-size: 0.88rem; border-right: 1px solid #E6E9EE; }
          .meta-table td:last-child { border-right: none; }
          .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .grid-table td { width: 50%; vertical-align: top; }
          .bill-to-box { border: 1px solid #E6E9EE; border-radius: 8px; padding: 16px; background: #FAFBFC; }
          .bill-to-box h3 { margin: 0 0 8px 0; color: #07A96A; font-size: 0.95rem; text-transform: uppercase; font-weight: 800; }
          .item-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .item-table th { background: #F9FAFB; color: #6B7280; text-align: left; padding: 10px 14px; font-size: 0.8rem; text-transform: uppercase; font-weight: 800; border-bottom: 1px solid #E6E9EE; }
          .item-table td { padding: 14px; border-bottom: 1px solid #E6E9EE; font-size: 0.88rem; vertical-align: top; }
          .subtotal-row td { font-weight: 800; background: #F9FAFB; }
          .bank-terms-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .bank-terms-table td { width: 50%; vertical-align: top; padding-right: 16px; }
          .bank-box { border: 1px solid #BFDBFE; background: #EFF6FF; padding: 14px; border-radius: 8px; font-size: 0.85rem; }
          .bank-box h4 { margin: 0 0 6px 0; color: #0B6BE6; font-size: 0.95rem; }
          .terms-box { border: 1px solid #FDE68A; background: #FEF7E1; padding: 14px; border-radius: 8px; font-size: 0.8rem; color: #A16207; }
          .terms-box h4 { margin: 0 0 6px 0; }
          .summary-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
          .summary-table td { padding: 8px 12px; border-bottom: 1px solid #E6E9EE; }
          .summary-table tr:last-child td { border-bottom: none; font-weight: 800; }
          .summary-box { border: 1px solid #E6E9EE; border-radius: 8px; padding: 12px; margin-bottom: 14px; background: #FFFFFF; }
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
                <div class="company-name">PATRONPING TECHNOLOGIES</div>
                <div style="font-size: 0.85rem; color: #4B5563;">
                  PatronPing Enterprise Cloud Services<br/>
                  Sector-75, Noida, UP 201301<br/>
                  Support: billing@patronping.com | Phone: +91 9429693456<br/>
                  GSTIN: 10ABOCS8219H1Z8 | PAN: ABOCS8219H
                </div>
              </td>
              <td style="text-align: right;">
                <div class="invoice-title">COMMERCIAL INVOICE</div>
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
              <td style="padding-right: 12px;">
                <div class="bill-to-box">
                  <h3>BILL TO</h3>
                  <strong>${company?.name || 'Client Organization'}</strong><br/>
                  ${[company?.city, company?.state, company?.country].filter(Boolean).join(', ') || 'Address not registered'}<br/>
                  Email: ${company?.admin_email || company?.email || '—'}<br/>
                  Phone: ${company?.phone || '—'}
                </div>
              </td>
              <td style="padding-left: 12px;">
                <div class="summary-box">
                  <table class="summary-table">
                    <tr>
                      <td>Total Billed:</td>
                      <td style="text-align: right; font-weight: 700;">${money(p.amount)}</td>
                    </tr>
                    <tr>
                      <td>Amount Settled:</td>
                      <td style="text-align: right; color: #16A34A; font-weight: 700;">${money(isPaid ? p.amount : 0)}</td>
                    </tr>
                    <tr>
                      <td>Balance Due:</td>
                      <td style="text-align: right; color: ${isPaid ? '#16A34A' : '#DC2626'}; font-weight: 800;">${money(isPaid ? 0 : p.amount)}</td>
                    </tr>
                  </table>
                </div>
                <div style="border: 1px solid #BFDBFE; background: #EFF6FF; padding: 10px 12px; border-radius: 8px; font-size: 0.85rem;">
                  <strong>Amount in words:</strong><br/>
                  <span style="font-style: italic; color: #0B6BE6;">${amtWords}</span>
                </div>
              </td>
            </tr>
          </table>

          <table class="item-table">
            <thead>
              <tr>
                <th>SERVICES & QUOTAS</th>
                <th style="text-align: right; width: 130px;">RATE</th>
                <th style="text-align: right; width: 130px;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong style="color: #07A96A;">PATRONPING SALES ENTERPRISE — ${planName.toUpperCase()} PLAN (${cycle})</strong>
                  <div style="font-size: 0.82rem; color: #4B5563; margin-top: 6px;">
                    Included modules & features:
                    <ul style="margin: 4px 0 0 0; padding-left: 18px;">
                      ${featuresList.map((f) => `<li>${f}</li>`).join('')}
                    </ul>
                  </div>
                </td>
                <td style="text-align: right; font-weight: 700;">${money(p.amount)}</td>
                <td style="text-align: right; font-weight: 700;">${money(p.amount)}</td>
              </tr>
              <tr class="subtotal-row">
                <td>TOTAL PAYABLE</td>
                <td colspan="2" style="text-align: right; color: #07A96A; font-size: 1rem;">${money(p.amount)}</td>
              </tr>
            </tbody>
          </table>

          <table class="bank-terms-table">
            <tr>
              <td>
                <div class="bank-box">
                  <h4>Settlement Account Details</h4>
                  <strong>Beneficiary:</strong> PATRONPING TECHNOLOGIES PVT. LTD.<br/>
                  <strong>Bank:</strong> State Bank of India<br/>
                  <strong>Account No:</strong> 45182936194<br/>
                  <strong>IFSC:</strong> SBIN0001483<br/>
                  <strong>UPI:</strong> 9429693456@sbi
                </div>
              </td>
              <td>
                <div class="terms-box">
                  <h4>Terms & Payment Conditions</h4>
                  1. Payments are due upon receipt or before the indicated due date.<br/>
                  2. Automated WABA and CRM access renews upon transaction settlement.<br/>
                  3. Invoices are computer generated and valid without signature.
                </div>
              </td>
            </tr>
          </table>
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
  const [filterType, setFilterType] = useState('all');

  // Modal control
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);

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
      setPayments(payRes.payments || []);
      setCompanies(compRes.companies || []);
      setPlans(planRes.plans || []);
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
        ? isYearly
          ? selectedPlan.price_yearly
          : selectedPlan.price_monthly
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

  const filteredPayments = payments.filter((p) => {
    if (filterType === 'all') return true;
    if (filterType === 'paid') return p.status === 'paid';
    if (filterType === 'pending') return p.status === 'pending' && (!p.due_date || new Date(p.due_date) >= new Date());
    if (filterType === 'overdue') return p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date();
    return true;
  });

  return (
    <div className="sa-billing-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .sa-billing-page,
        .sa-billing-page * {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          box-sizing: border-box;
        }
        .sa-field-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #374151;
          margin-bottom: 6px;
        }
        .sa-form-input {
          width: 100%;
          height: 38px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid #D0D5DD;
          background-color: #FFFFFF;
          font-size: 13.5px;
          color: #111827;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .sa-form-input:focus {
          border-color: #0B6BE6;
          box-shadow: 0 0 0 4px rgba(11, 107, 230, 0.15);
        }
      `}</style>

      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
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
              color: '#07A96A',
              marginBottom: '4px',
            }}
          >
            <span>Finance & Audit</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>Commercial Invoicing</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
            Billing & Invoices
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '13.5px' }}>
            Manage invoices, audit settled platform transactions, and track account receivables.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          style={{
            height: '40px',
            padding: '0 18px',
            borderRadius: '12px',
            background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
            border: 'none',
            color: '#FFFFFF',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 2px rgba(3, 111, 69, 0.35)',
          }}
        >
          <Plus size={16} />
          <span>+ Create Invoice</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#FEECEC', color: '#DC2626', border: '1px solid #FECACA', fontSize: '13.5px', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* 2. Top Summary KPI Cards (4 Stats) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Pending Invoices</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FEF7E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A16207' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#A16207', marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            Awaiting client remittance
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Settled Invoices</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#E8F7EE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#16A34A', marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>
            {stats.paid}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            Paid & credited invoices
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Overdue Invoices</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FEECEC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#DC2626', marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>
            {stats.overdue}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            Past specified due dates
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E6E9EE', borderRadius: '18px', padding: '20px', boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563' }}>Total Revenue</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#E8F8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#067C52' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#067C52', marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>
            {money(stats.revenue)}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            All-time collected revenue
          </div>
        </div>
      </div>

      {/* 3. Toolbar & Status Filter */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '14px',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 2px rgba(16,24,40,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#4B5563' }}>Filter:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #D0D5DD',
              fontSize: '13px',
              color: '#111827',
              outline: 'none',
              cursor: 'pointer',
              backgroundColor: '#FFFFFF',
            }}
          >
            <option value="all">All Invoices</option>
            <option value="pending">Pending Only</option>
            <option value="paid">Paid Only</option>
            <option value="overdue">Overdue Only</option>
          </select>
        </div>

        <div style={{ fontSize: '13px', color: '#6B7280' }}>
          Matching records: <strong style={{ color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{filteredPayments.length}</strong>
        </div>
      </div>

      {/* 4. High-Density Enterprise Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(16,24,40,0.02)',
        }}
      >
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '960px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
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
                  whiteSpace: 'nowrap',
                }}
              >
                <th style={{ padding: '12px 16px', minWidth: '150px' }}>INVOICE #</th>
                <th style={{ padding: '12px 16px', minWidth: '190px' }}>COMPANY</th>
                <th style={{ padding: '12px 16px', minWidth: '130px' }}>PLAN</th>
                <th style={{ padding: '12px 16px', minWidth: '130px' }}>AMOUNT</th>
                <th style={{ padding: '12px 16px', minWidth: '100px' }}>CYCLE</th>
                <th style={{ padding: '12px 16px', minWidth: '130px' }}>DUE DATE</th>
                <th style={{ padding: '12px 16px', minWidth: '110px' }}>STATUS</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', minWidth: '240px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: '#6B7280' }}>
                    Loading billing ledger…
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: '#9CA3AF' }}>
                    No invoice transactions found matching this view.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p, index) => {
                  const isOverdue =
                    p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date();

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        backgroundColor: index % 2 === 1 ? '#FAFBFC' : '#FFFFFF',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                        {p.invoice_number}
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#07A96A' }}>
                        {p.company_name}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#4B5563' }}>
                        {p.plan_name || 'Trial'}
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                        {money(p.amount)}
                      </td>

                      <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#6B7280' }}>
                        {p.billing_cycle}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#4B5563', fontVariantNumeric: 'tabular-nums' }}>
                        {formatDate(p.due_date)}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor:
                              p.status === 'paid'
                                ? '#E8F7EE'
                                : isOverdue
                                ? '#FEECEC'
                                : '#FEF7E1',
                            color:
                              p.status === 'paid'
                                ? '#16A34A'
                                : isOverdue
                                ? '#DC2626'
                                : '#A16207',
                            border: `1px solid ${
                              p.status === 'paid'
                                ? '#BBF7D0'
                                : isOverdue
                                ? '#FECACA'
                                : '#FDE68A'
                            }`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {p.status === 'paid' ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setActiveInvoice(p)}
                            style={{
                              height: '28px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              border: '1px solid #BFDBFE',
                              backgroundColor: '#EFF6FF',
                              color: '#0B6BE6',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Invoice
                          </button>

                          {p.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(p.id)}
                              style={{
                                height: '28px',
                                padding: '0 8px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
                                color: '#FFFFFF',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Mark Paid
                            </button>
                          )}

                          <a
                            href={getWhatsAppLink(p)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              height: '28px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#25D366',
                              color: '#FFFFFF',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              textDecoration: 'none',
                            }}
                          >
                            <MessageSquare size={12} />
                            <span>WhatsApp</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDelete(p.id)}
                            style={{
                              height: '28px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              border: '1px solid #FCA5A5',
                              backgroundColor: '#FFFFFF',
                              color: '#DC2626',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
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

      {/* 5. CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 17, 24, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setShowCreateModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 12px 32px -8px rgba(16, 24, 40, 0.18)',
              border: '1px solid #E6E9EE',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#111827', margin: 0 }}>
                  Create Customer Invoice
                </h3>
                <p style={{ fontSize: '12.5px', color: '#6B7280', margin: '2px 0 0 0' }}>
                  Generate a commercial billing record and payment order for tenant organization.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label className="sa-field-label">Target Company *</label>
                  <select
                    value={form.company_id}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    required
                    className="sa-form-input"
                  >
                    <option value="">Select Tenant Company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="sa-field-label">Plan Tier</label>
                    <select
                      value={form.plan_id}
                      onChange={(e) => handlePlanChange(e.target.value)}
                      className="sa-form-input"
                    >
                      <option value="">Trial Plan</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="sa-field-label">Billing Cycle</label>
                    <select
                      value={form.billing_cycle}
                      onChange={(e) => handleCycleChange(e.target.value)}
                      className="sa-form-input"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="sa-field-label">Amount (INR) *</label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      required
                      placeholder="e.g. 4999"
                      className="sa-form-input"
                    />
                  </div>

                  <div>
                    <label className="sa-field-label">Due Date</label>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                      className="sa-form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="sa-field-label">Notes & Payment Reference</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    placeholder="PO number, payment terms, or custom scope notes..."
                    className="sa-form-input"
                    style={{ height: 'auto', padding: '10px 12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={busy}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    borderRadius: '10px',
                    border: '1px solid #D0D5DD',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    height: '38px',
                    padding: '0 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(180deg, #07A96A 0%, #036F45 100%)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: busy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {busy ? 'Generating…' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. INVOICE PREVIEW & PRINT MODAL */}
      {activeInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 17, 24, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveInvoice(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '860px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
              border: '1px solid #E6E9EE',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid #E6E9EE',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F9FAFB',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                  Invoice: {activeInvoice.invoice_number}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: activeInvoice.status === 'paid' ? '#E8F7EE' : '#FEF7E1',
                    color: activeInvoice.status === 'paid' ? '#16A34A' : '#A16207',
                    textTransform: 'uppercase',
                  }}
                >
                  {activeInvoice.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const company = companies.find((c) => c.id === activeInvoice.company_id);
                    const plan = plans.find((p) => p.name === activeInvoice.plan_name);
                    const html = getInvoicePrintHtml(activeInvoice, company, plan);
                    const win = window.open('', '_blank');
                    win.document.write(html);
                    win.document.close();
                    win.focus();
                    setTimeout(() => win.print(), 300);
                  }}
                  style={{
                    height: '34px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    border: '1px solid #D0D5DD',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Printer size={14} />
                  <span>Print / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInvoice(null)}
                  style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body Preview iframe */}
            <div style={{ flex: 1, padding: '16px', minHeight: '520px', backgroundColor: '#F9FAFB' }}>
              <iframe
                title="Invoice Preview"
                srcDoc={getInvoicePrintHtml(
                  activeInvoice,
                  companies.find((c) => c.id === activeInvoice.company_id),
                  plans.find((p) => p.name === activeInvoice.plan_name)
                )}
                style={{ width: '100%', height: '560px', border: '1px solid #E6E9EE', borderRadius: '12px', backgroundColor: '#FFFFFF' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
