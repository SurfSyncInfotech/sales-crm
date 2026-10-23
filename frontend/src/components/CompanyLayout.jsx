import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, FileText, Inbox, KanbanSquare, LayoutDashboard, Settings, Users, Workflow } from 'lucide-react';
import BrandLogo from './BrandLogo';

const links = [
  { to: '/company', label: 'Home', end: true, mobile: true, icon: <LayoutDashboard size={18} /> },
  { to: '/company/leads', label: 'Leads', mobile: true, icon: <Inbox size={18} /> },
  { to: '/company/pipeline', label: 'Pipeline', mobile: true, icon: <KanbanSquare size={18} /> },
  { to: '/company/tasks', label: 'Tasks', mobile: true, icon: <CheckSquare size={18} /> },
  { to: '/company/quotations', label: 'Quotes', mobile: true, icon: <FileText size={18} /> },
  { to: '/company/automation', label: 'Automation', icon: <Workflow size={18} /> },
  { to: '/company/team', label: 'Team', icon: <Users size={18} /> },
  { to: '/company/workflow-settings', label: 'Settings', icon: <Settings size={18} /> },
];

const titles = {
  '/company': 'Dashboard',
  '/company/leads': 'Leads',
  '/company/pipeline': 'Pipeline',
  '/company/tasks': 'Tasks',
  '/company/quotations': 'Quotations',
  '/company/automation': 'Automation',
  '/company/team': 'Team',
  '/company/workflow-settings': 'Settings',
};

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

export default function CompanyLayout() {
  const { user, logout } = useAuth('company');
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = titles[location.pathname] || 'Company';

  function handleLogout() {
    logout();
    navigate('/company/login');
  }

  const pendingInvoice = user?.company?.pending_invoice;

  if (pendingInvoice) {
    const handlePrint = () => {
      const win = window.open('', '_blank');
      const amtWords = numberToWords(pendingInvoice.amount);
      const formattedDueDate = formatDate(pendingInvoice.due_date);
      const formattedInvoiceDate = formatDate(pendingInvoice.created_at || new Date());
      const planName = pendingInvoice.plan_name || 'Trial';
      
      const featuresList = ['Basic CRM Access', 'Lead Retrieval & Assignment', 'WhatsApp Integration', 'Basic Reports'];

      const printHtml = `
        <html>
          <head>
            <title>Invoice ${pendingInvoice.invoice_number} - ${user?.company?.name || 'Company'}</title>
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
                  <td><strong>Invoice No:</strong> ${pendingInvoice.invoice_number}</td>
                  <td><strong>Invoice Date:</strong> ${formattedInvoiceDate}</td>
                  <td><strong>Due Date:</strong> ${formattedDueDate}</td>
                </tr>
              </table>

              <table class="grid-table">
                <tr>
                  <td style="padding-right: 10px;">
                    <div class="bill-to-box">
                      <h3>BILL TO</h3>
                      <strong>${user?.company?.name || 'Company'}</strong><br/>
                      ${[user?.company?.city, user?.company?.state, user?.company?.country].filter(Boolean).join(', ') || 'Address not set'}<br/>
                      Email: ${user?.company?.admin_email || user?.company?.email || '—'}<br/>
                      Phone: ${user?.company?.phone || '—'}
                    </div>
                  </td>
                  <td style="padding-left: 10px;">
                    <div class="summary-box">
                      <table class="summary-table">
                        <tr>
                          <td>Total Amount:</td>
                          <td style="text-align: right; font-weight: 600;">${money(pendingInvoice.amount)}</td>
                        </tr>
                        <tr>
                          <td>Received Amount:</td>
                          <td style="text-align: right; color: #1f9a5a; font-weight: 600;">${money(0)}</td>
                        </tr>
                        <tr>
                          <td>Balance Due:</td>
                          <td style="text-align: right; color: #c53929; font-weight: 700;">${money(pendingInvoice.amount)}</td>
                        </tr>
                      </table>
                    </div>
                    <div style="border: 1px solid #d2e3fc; background: #e8f0fe; padding: 10px; border-radius: 6px; font-size: 0.85rem; margin-top: 10px;">
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
                    <td style="text-align: right; font-weight: 600;">${money(pendingInvoice.amount)}</td>
                    <td style="text-align: right; font-weight: 600;">${money(pendingInvoice.amount)}</td>
                  </tr>
                  <tr class="subtotal-row">
                    <td>SUBTOTAL</td>
                    <td colspan="2" style="text-align: right; color: #1f9a5a;">${money(pendingInvoice.amount)}</td>
                  </tr>
                </tbody>
              </table>

              <table class="bank-terms-table">
                <tr>
                  <td>
                    <div class="bank-box">
                      <h4>🏦 Bank Details</h4>
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
      win.document.write(printHtml);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 500);
    };

    return (
      <div className="lock-screen-container" style={{ background: '#f4f6f9', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem', boxSizing: 'border-box' }}>
        <div style={{ background: 'var(--green-600)', color: '#fff', padding: '2rem 1.5rem', borderRadius: '12px 12px 0 0', textAlign: 'center', width: '100%', maxWidth: '650px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700' }}>Subscription Payment Pending</h2>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', opacity: 0.9 }}>
            Invoice #{pendingInvoice.invoice_number} has been generated for {user?.company?.name || 'your company'}.
          </p>
        </div>
        
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '0 0 12px 12px', width: '100%', maxWidth: '650px', boxSizing: 'border-box', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', display: 'grid', gap: '1.5rem' }}>
          
          {/* Card 1: Invoice details */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <small style={{ color: '#718096', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>INVOICE NUMBER</small>
                <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>#{pendingInvoice.invoice_number}</div>
              </div>
              <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', fontWeight: '700', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                ⚠️ PAYMENT PENDING
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px dashed #e2e8f0', paddingTop: '1rem' }}>
              <div>
                <small style={{ color: '#718096', display: 'block', fontSize: '0.85rem' }}>Plan</small>
                <strong style={{ fontSize: '1rem' }}>{pendingInvoice.plan_name || 'Trial'}</strong>
              </div>
              <div>
                <small style={{ color: '#718096', display: 'block', fontSize: '0.85rem' }}>Billing Cycle</small>
                <strong style={{ fontSize: '1rem', textTransform: 'uppercase' }}>{pendingInvoice.billing_cycle}</strong>
              </div>
              <div>
                <small style={{ color: '#718096', display: 'block', fontSize: '0.85rem' }}>Total Amount</small>
                <strong style={{ fontSize: '1.1rem', color: 'var(--green-600)' }}>{money(pendingInvoice.amount)}</strong>
              </div>
              <div>
                <small style={{ color: '#718096', display: 'block', fontSize: '0.85rem' }}>Due Date</small>
                <strong style={{ fontSize: '1rem', color: '#c53929' }}>{formatDate(pendingInvoice.due_date)}</strong>
              </div>
            </div>
          </div>

          {/* Card 2: UPI details */}
          <div style={{ border: '1px solid #b3d7ff', backgroundColor: '#f0f7ff', borderRadius: '8px', padding: '1.25rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0056b3' }}>
              <span>🏦</span> SurfSync Bank & UPI Transfer Details
            </h4>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#495057' }}>Company Name:</span>
                <strong style={{ color: '#212529' }}>SURFSYNC INFOTECH PRIVATE LIMITED</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#495057' }}>Bank Name:</span>
                <strong style={{ color: '#212529' }}>State Bank of India, LAL GANJ</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#495057' }}>Account Number:</span>
                <strong style={{ color: '#212529' }}>45182936194</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#495057' }}>IFSC Code:</span>
                <strong style={{ color: '#212529' }}>SBIN0001483</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#495057' }}>GPay / PhonePe / UPI:</span>
                <strong style={{ color: '#212529' }}>9429693456 / surfsync@sbi</strong>
              </div>
            </div>
          </div>

          {/* Notice Card */}
          <div style={{ border: '1px solid #ffeeba', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '8px', padding: '1rem', fontSize: '0.85rem', lineHeight: '1.4' }}>
            <strong>💡 Note:</strong> Kripya upar diya gaya Bank/UPI details par payment karein. SuperAdmin aapka payment confirm (Mark Paid) karte hi aapka CRM account activate kar dega.
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <button
              type="button"
              className="primary-btn"
              onClick={handlePrint}
              style={{ padding: '0.75rem', width: '100%', background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
              View / Download Pending Invoice PDF
            </button>
            
            <button
              type="button"
              className="primary-btn"
              onClick={() => alert("Online payment integration is coming soon. Please use the UPI / Bank Transfer details above for now.")}
              style={{ padding: '0.75rem', width: '100%', background: '#fff', color: '#007bff', border: '1px solid #007bff', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
              Or Pay Online via Razorpay →
            </button>
            
            <button
              type="button"
              className="gov-btn"
              onClick={handleLogout}
              style={{ padding: '0.75rem', width: '100%', backgroundColor: '#f8f9fa', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar desktop-only">
        <BrandLogo />
        <p className="sidebar-kicker">{user?.company?.name || 'Company'}</p>

        <nav className="side-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon">{link.icon}</span>
              {link.label === 'Home' ? 'Dashboard' : link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <span className="avatar">{user?.name?.charAt(0) || 'C'}</span>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.role === 'company_admin' ? 'Company admin' : 'Salesperson'}</small>
            </div>
          </div>
          <button type="button" className="ghost-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="app-frame">
        <header className="mobile-topbar mobile-only">
          <BrandLogo variant="compact" />
          <div className="mobile-topbar-meta">
            <div>
              <p className="eyebrow">{user?.company?.name || 'Company'}</p>
              <strong>{pageTitle}</strong>
            </div>
            <button type="button" className="avatar-btn" onClick={handleLogout} title="Sign out">
              <span className="avatar">{user?.name?.charAt(0) || 'C'}</span>
            </button>
          </div>
        </header>

        <main className="main">
          <Outlet />
        </main>

        <nav className="mobile-tabbar mobile-tabbar-5 mobile-only" aria-label="Primary">
          {links.filter((l) => l.mobile).map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="nav-icon">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
